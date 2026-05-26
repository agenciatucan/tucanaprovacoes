"use server";
// ============================================================
// SERVER ACTIONS — Observações / Histórico
// ============================================================

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

type Result<T = void> = { success: true; data: T } | { success: false; error: string };

export async function resolveComment(commentId: string): Promise<Result> {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Não autorizado" };

  const { data: profile } = await supabase
    .from("user_profiles").select("id, role").eq("auth_user_id", user.id).single();
  if (!profile || !["admin", "equipe"].includes(profile.role)) {
    return { success: false, error: "Sem permissão" };
  }

  const { error } = await supabase
    .from("comments_history")
    .update({ status: "resolvida", resolved_at: new Date().toISOString(), resolved_by: profile.id })
    .eq("id", commentId);

  if (error) return { success: false, error: "Erro ao resolver observação" };

  revalidatePath("/admin/observacoes");
  revalidatePath("/admin");
  return { success: true, data: undefined };
}

export async function addInternalComment(
  contentItemId: string,
  campaignId: string,
  message: string
): Promise<Result> {
  if (!message?.trim() || message.trim().length < 3) {
    return { success: false, error: "Mensagem muito curta" };
  }

  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Não autorizado" };

  const { data: profile } = await supabase
    .from("user_profiles").select("id, role").eq("auth_user_id", user.id).single();
  if (!profile) return { success: false, error: "Perfil não encontrado" };

  const { data: campaign } = await supabase
    .from("campaigns").select("client_id").eq("id", campaignId).single();
  if (!campaign) return { success: false, error: "Cronograma não encontrado" };

  const { error } = await supabase.from("comments_history").insert({
    content_item_id: contentItemId,
    campaign_id: campaignId,
    client_id: campaign.client_id,
    user_id: profile.id,
    message: message.trim(),
    status: "aberta",
  });

  if (error) return { success: false, error: "Erro ao adicionar observação" };

  revalidatePath(`/admin/cronogramas/${campaignId}`);
  return { success: true, data: undefined };
}
