"use server";
// ============================================================
// SERVER ACTIONS — Posts / Content Items
// ============================================================

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { contentItemSchema, type ContentItemInput } from "@/lib/validations/schemas";
import { revalidatePath } from "next/cache";

type Result<T = void> = { success: true; data: T } | { success: false; error: string };

async function requireStaff(supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("user_profiles").select("id, role").eq("auth_user_id", user.id).single();
  if (!data || !["admin", "equipe"].includes(data.role)) return null;
  return data;
}

// Busca o próximo order_index disponível para a campanha
async function getNextOrderIndex(supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>, campaignId: string) {
  const { data } = await supabase
    .from("content_items")
    .select("order_index")
    .eq("campaign_id", campaignId)
    .order("order_index", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.order_index ?? -1) + 1;
}

export async function createContentItem(
  input: ContentItemInput
): Promise<Result<{ id: string }>> {
  const parsed = contentItemSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const supabase = await getSupabaseServerClient();
  const profile = await requireStaff(supabase);
  if (!profile) return { success: false, error: "Sem permissão" };

  // Buscar client_id da campanha
  const { data: campaign } = await supabase
    .from("campaigns").select("client_id").eq("id", parsed.data.campaign_id).single();
  if (!campaign) return { success: false, error: "Cronograma não encontrado" };

  // Sempre calcula o próximo índice disponível para evitar violação de
  // UNIQUE (campaign_id, order_index) — o form começa em 0, mas pode já existir
  const orderIndex = await getNextOrderIndex(supabase, parsed.data.campaign_id);

  const { data, error } = await supabase
    .from("content_items")
    .insert({
      ...parsed.data,
      order_index: orderIndex,
      client_id: campaign.client_id,
      theme_status: "aguardando",
      caption_status: "aguardando",
      artwork_status: "aguardando",
      general_status: "pendente",
      is_locked: false,
      created_by: profile.id,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[createContentItem]", error?.message, error?.code, error?.details);
    return { success: false, error: error?.message ?? "Erro ao criar post" };
  }

  revalidatePath(`/admin/cronogramas/${parsed.data.campaign_id}`);
  return { success: true, data: { id: data.id } };
}

export async function updateContentItem(
  id: string,
  input: ContentItemInput
): Promise<Result> {
  const parsed = contentItemSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const supabase = await getSupabaseServerClient();
  const profile = await requireStaff(supabase);
  if (!profile) return { success: false, error: "Sem permissão" };

  // Não sobrescreve status de aprovação ao editar conteúdo
  const { campaign_id, ...updateData } = parsed.data;
  const { error } = await supabase
    .from("content_items")
    .update(updateData)
    .eq("id", id);

  if (error) {
    console.error("[updateContentItem]", error.message, error.code, error.details);
    return { success: false, error: error.message ?? "Erro ao atualizar post" };
  }

  revalidatePath(`/admin/cronogramas/${campaign_id}`);
  revalidatePath(`/admin/posts/${id}`);
  return { success: true, data: undefined };
}

export async function deleteContentItem(id: string): Promise<Result> {
  const supabase = await getSupabaseServerClient();
  const profile = await requireStaff(supabase);
  if (!profile) return { success: false, error: "Sem permissão" };

  // Buscar campaign_id antes de deletar para revalidar
  const { data: item } = await supabase
    .from("content_items").select("campaign_id").eq("id", id).single();

  const { error } = await supabase.from("content_items").delete().eq("id", id);
  if (error) return { success: false, error: "Erro ao excluir post" };

  if (item?.campaign_id) revalidatePath(`/admin/cronogramas/${item.campaign_id}`);
  return { success: true, data: undefined };
}

export async function updateContentItemStatus(
  id: string,
  field: "theme_status" | "caption_status" | "artwork_status" | "general_status",
  value: string
): Promise<Result> {
  const supabase = await getSupabaseServerClient();
  const profile = await requireStaff(supabase);
  if (!profile) return { success: false, error: "Sem permissão" };

  const { data: item } = await supabase
    .from("content_items").select("campaign_id").eq("id", id).single();

  const { error } = await supabase
    .from("content_items").update({ [field]: value }).eq("id", id);

  if (error) return { success: false, error: "Erro ao atualizar status" };

  if (item?.campaign_id) revalidatePath(`/admin/cronogramas/${item.campaign_id}`);
  return { success: true, data: undefined };
}
