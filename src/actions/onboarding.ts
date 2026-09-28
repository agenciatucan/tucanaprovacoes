"use server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  onboardingItemToggleSchema, type OnboardingItemToggleInput,
  onboardingSectionSchema, type OnboardingSectionInput,
  onboardingTemplateItemSchema, type OnboardingTemplateItemInput,
} from "@/lib/validations/schemas";
import { revalidatePath } from "next/cache";
import { logger } from "@/lib/logger";

type Result<T = void> = { success: true; data: T } | { success: false; error: string };

async function requireStaff(supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("user_profiles")
    .select("id, role")
    .eq("auth_user_id", user.id)
    .single();

  if (!data || !["admin", "equipe"].includes(data.role)) return null;
  return data;
}

async function requireAdmin(supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("user_profiles")
    .select("id, role")
    .eq("auth_user_id", user.id)
    .single();

  if (!data || data.role !== "admin") return null;
  return data;
}

const TEMPLATE_PATH = "/admin/configuracoes/onboarding";

// ── Estado por cliente (admin + equipe) ───────────────────────
export async function toggleOnboardingItem(input: OnboardingItemToggleInput): Promise<Result> {
  const parsed = onboardingItemToggleSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  const supabase = await getSupabaseServerClient();
  const profile = await requireStaff(supabase);
  if (!profile) return { success: false, error: "Sem permissão" };

  const { client_id, item_id, done } = parsed.data;

  const { error } = await supabase
    .from("client_onboarding_items")
    .upsert(
      {
        client_id,
        item_id,
        done,
        done_at: done ? new Date().toISOString() : null,
        done_by: done ? profile.id : null,
      },
      { onConflict: "client_id,item_id" }
    );

  if (error) {
    logger.error("toggleOnboardingItem", error.message);
    return { success: false, error: "Erro ao atualizar item do checklist" };
  }

  revalidatePath(`/admin/clientes/${client_id}`);
  return { success: true, data: undefined };
}

// ── Catálogo — seções (apenas admin) ──────────────────────────
export async function createOnboardingSection(input: OnboardingSectionInput): Promise<Result<{ id: string }>> {
  const parsed = onboardingSectionSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  const supabase = await getSupabaseServerClient();
  const profile = await requireAdmin(supabase);
  if (!profile) return { success: false, error: "Sem permissão" };

  const { data: maxRow } = await supabase
    .from("onboarding_sections")
    .select("order_index")
    .order("order_index", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await supabase
    .from("onboarding_sections")
    .insert({ ...parsed.data, order_index: (maxRow?.order_index ?? -1) + 1 })
    .select("id")
    .single();

  if (error || !data) {
    logger.error("createOnboardingSection", error?.message ?? "sem dados retornados");
    return { success: false, error: error?.code === "23505" ? "Já existe uma seção com essa chave" : "Erro ao criar seção" };
  }

  revalidatePath(TEMPLATE_PATH);
  return { success: true, data: { id: data.id } };
}

export async function updateOnboardingSection(id: string, input: OnboardingSectionInput): Promise<Result> {
  const parsed = onboardingSectionSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  const supabase = await getSupabaseServerClient();
  const profile = await requireAdmin(supabase);
  if (!profile) return { success: false, error: "Sem permissão" };

  const { error } = await supabase.from("onboarding_sections").update(parsed.data).eq("id", id);
  if (error) {
    logger.error("updateOnboardingSection", error.message);
    return { success: false, error: error.code === "23505" ? "Já existe uma seção com essa chave" : "Erro ao atualizar seção" };
  }

  revalidatePath(TEMPLATE_PATH);
  return { success: true, data: undefined };
}

// Remove a seção e, em cascata, todos os itens dela e o estado desses
// itens em todos os clientes (client_onboarding_items).
export async function deleteOnboardingSection(id: string): Promise<Result> {
  const supabase = await getSupabaseServerClient();
  const profile = await requireAdmin(supabase);
  if (!profile) return { success: false, error: "Sem permissão" };

  const { error } = await supabase.from("onboarding_sections").delete().eq("id", id);
  if (error) {
    logger.error("deleteOnboardingSection", error.message);
    return { success: false, error: "Erro ao excluir seção" };
  }

  revalidatePath(TEMPLATE_PATH);
  revalidatePath("/admin/clientes");
  return { success: true, data: undefined };
}

// ── Catálogo — itens (apenas admin) ───────────────────────────
export async function createOnboardingItem(input: OnboardingTemplateItemInput): Promise<Result<{ id: string }>> {
  const parsed = onboardingTemplateItemSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  const supabase = await getSupabaseServerClient();
  const profile = await requireAdmin(supabase);
  if (!profile) return { success: false, error: "Sem permissão" };

  const { data: maxRow } = await supabase
    .from("onboarding_items")
    .select("order_index")
    .eq("section_id", parsed.data.section_id)
    .order("order_index", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await supabase
    .from("onboarding_items")
    .insert({ ...parsed.data, order_index: (maxRow?.order_index ?? -1) + 1 })
    .select("id")
    .single();

  if (error || !data) {
    logger.error("createOnboardingItem", error?.message ?? "sem dados retornados");
    return { success: false, error: error?.code === "23505" ? "Já existe um item com essa chave" : "Erro ao criar item" };
  }

  // Novo item entra pendente para todo cliente que já existe.
  const { data: clients } = await supabase.from("clients").select("id");
  if (clients && clients.length > 0) {
    const rows = clients.map((c) => ({ client_id: c.id, item_id: data.id }));
    const { error: seedError } = await supabase.from("client_onboarding_items").insert(rows);
    if (seedError) logger.error("createOnboardingItem:seedClients", seedError.message);
  }

  revalidatePath(TEMPLATE_PATH);
  revalidatePath("/admin/clientes");
  return { success: true, data: { id: data.id } };
}

export async function updateOnboardingItem(id: string, input: OnboardingTemplateItemInput): Promise<Result> {
  const parsed = onboardingTemplateItemSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  const supabase = await getSupabaseServerClient();
  const profile = await requireAdmin(supabase);
  if (!profile) return { success: false, error: "Sem permissão" };

  const { error } = await supabase.from("onboarding_items").update(parsed.data).eq("id", id);
  if (error) {
    logger.error("updateOnboardingItem", error.message);
    return { success: false, error: error.code === "23505" ? "Já existe um item com essa chave" : "Erro ao atualizar item" };
  }

  revalidatePath(TEMPLATE_PATH);
  revalidatePath("/admin/clientes");
  return { success: true, data: undefined };
}

// Remove o item do catálogo — em cascata, remove o estado dele de
// todo cliente que o tinha (client_onboarding_items).
export async function deleteOnboardingItem(id: string): Promise<Result> {
  const supabase = await getSupabaseServerClient();
  const profile = await requireAdmin(supabase);
  if (!profile) return { success: false, error: "Sem permissão" };

  const { error } = await supabase.from("onboarding_items").delete().eq("id", id);
  if (error) {
    logger.error("deleteOnboardingItem", error.message);
    return { success: false, error: "Erro ao excluir item" };
  }

  revalidatePath(TEMPLATE_PATH);
  revalidatePath("/admin/clientes");
  return { success: true, data: undefined };
}
