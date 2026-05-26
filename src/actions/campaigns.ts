// ============================================================
// SERVER ACTIONS — Cronogramas
// ============================================================
"use server";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { campaignSchema, type CampaignInput } from "@/lib/validations/schemas";
import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

// Gera token criptograficamente seguro para aprovação
function generateApprovalToken(): string {
  return randomBytes(32).toString("hex");
}

// Token expira em 90 dias
function getTokenExpiry(): string {
  const date = new Date();
  date.setDate(date.getDate() + 90);
  return date.toISOString();
}

export async function createCampaign(
  input: CampaignInput
): Promise<ActionResult<{ id: string }>> {
  const parsed = campaignSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Não autorizado" };

  // Apenas admin/equipe pode criar cronogramas
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("id, role")
    .eq("auth_user_id", user.id)
    .single();

  if (!profile || !["admin", "equipe"].includes(profile.role)) {
    return { success: false, error: "Sem permissão para criar cronogramas" };
  }

  const { data, error } = await supabase
    .from("campaigns")
    .insert({
      ...parsed.data,
      end_date: parsed.data.end_date || null,
      overview: parsed.data.overview || null,
      status: "rascunho",
      approval_token: generateApprovalToken(),
      token_expires_at: getTokenExpiry(),
      is_locked: false,
      created_by: profile.id,   // user_profiles.id, não auth_user_id
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[createCampaign] Supabase error:", error);
    return { success: false, error: error?.message ?? "Erro ao criar cronograma" };
  }

  revalidatePath("/admin/cronogramas");
  return { success: true, data: { id: data.id } };
}

export async function updateCampaign(
  id: string,
  input: CampaignInput
): Promise<ActionResult> {
  const parsed = campaignSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Não autorizado" };

  const { data: profile } = await supabase
    .from("user_profiles").select("role").eq("auth_user_id", user.id).single();
  if (!profile || !["admin", "equipe"].includes(profile.role)) {
    return { success: false, error: "Sem permissão" };
  }

  const { error } = await supabase
    .from("campaigns")
    .update({ ...parsed.data, end_date: parsed.data.end_date || null, overview: parsed.data.overview || null })
    .eq("id", id);

  if (error) return { success: false, error: "Erro ao atualizar cronograma" };

  revalidatePath("/admin/cronogramas");
  revalidatePath(`/admin/cronogramas/${id}`);
  return { success: true, data: undefined };
}

export async function sendCampaignForApproval(
  campaignId: string
): Promise<ActionResult> {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Não autorizado" };

  const { data: profile } = await supabase
    .from("user_profiles").select("role").eq("auth_user_id", user.id).single();
  if (!profile || !["admin", "equipe"].includes(profile.role)) {
    return { success: false, error: "Sem permissão" };
  }

  // Verifica se há ao menos um post visível
  const { count } = await supabase
    .from("content_items")
    .select("*", { count: "exact", head: true })
    .eq("campaign_id", campaignId);

  if (!count || count === 0) {
    return { success: false, error: "Adicione ao menos um post antes de enviar para aprovação" };
  }

  const { error } = await supabase
    .from("campaigns")
    .update({ status: "enviado_para_aprovacao" })
    .eq("id", campaignId)
    .in("status", ["rascunho", "em_revisao"]); // só avança se estiver nesses status

  if (error) return { success: false, error: "Erro ao enviar para aprovação" };

  revalidatePath("/admin/cronogramas");
  revalidatePath(`/admin/cronogramas/${campaignId}`);
  return { success: true, data: undefined };
}

export async function updateCampaignStatus(
  campaignId: string,
  status: string
): Promise<ActionResult> {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Não autorizado" };

  const { data: profile } = await supabase
    .from("user_profiles").select("role").eq("auth_user_id", user.id).single();
  if (!profile || profile.role !== "admin") {
    return { success: false, error: "Apenas admins podem alterar status manualmente" };
  }

  const { error } = await supabase
    .from("campaigns").update({ status }).eq("id", campaignId);

  if (error) return { success: false, error: "Erro ao atualizar status" };

  revalidatePath("/admin/cronogramas");
  revalidatePath(`/admin/cronogramas/${campaignId}`);
  return { success: true, data: undefined };
}

// Regenera token de aprovação (invalida o antigo)
export async function regenerateApprovalToken(
  campaignId: string
): Promise<ActionResult<{ token: string }>> {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Não autorizado" };

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("auth_user_id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return { success: false, error: "Apenas admins podem regenerar tokens" };
  }

  const newToken = generateApprovalToken();
  const { error } = await supabase
    .from("campaigns")
    .update({
      approval_token: newToken,
      token_expires_at: getTokenExpiry(),
    })
    .eq("id", campaignId);

  if (error) return { success: false, error: "Erro ao regenerar token" };

  return { success: true, data: { token: newToken } };
}
