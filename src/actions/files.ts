"use server";
// ============================================================
// SERVER ACTIONS — Arquivos (Fase 7 do MVP)
// Upload via Supabase Storage — implementação completa na Fase 7
// ============================================================

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

type Result<T = void> = { success: true; data: T } | { success: false; error: string };

export async function deleteFile(fileId: string): Promise<Result> {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Não autorizado" };

  const { data: profile } = await supabase
    .from("user_profiles").select("role").eq("auth_user_id", user.id).single();
  if (!profile || !["admin", "equipe"].includes(profile.role)) {
    return { success: false, error: "Sem permissão" };
  }

  const { data: file } = await supabase
    .from("files").select("campaign_id, file_url").eq("id", fileId).single();

  // Remove do storage se URL for do Supabase
  if (file?.file_url?.includes("supabase.co")) {
    const path = file.file_url.split("/storage/v1/object/public/")[1];
    if (path) await supabase.storage.from("portal-files").remove([path]);
  }

  const { error } = await supabase.from("files").delete().eq("id", fileId);
  if (error) return { success: false, error: "Erro ao excluir arquivo" };

  if (file?.campaign_id) revalidatePath(`/admin/cronogramas/${file.campaign_id}`);
  return { success: true, data: undefined };
}

export async function toggleFileVisibility(
  fileId: string,
  visible: boolean
): Promise<Result> {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Não autorizado" };

  const { data: profile } = await supabase
    .from("user_profiles").select("role").eq("auth_user_id", user.id).single();
  if (!profile || !["admin", "equipe"].includes(profile.role)) {
    return { success: false, error: "Sem permissão" };
  }

  const { data: file } = await supabase
    .from("files").select("campaign_id").eq("id", fileId).single();

  const { error } = await supabase
    .from("files").update({ visible_to_client: visible }).eq("id", fileId);
  if (error) return { success: false, error: "Erro ao atualizar visibilidade" };

  if (file?.campaign_id) revalidatePath(`/admin/cronogramas/${file.campaign_id}`);
  return { success: true, data: undefined };
}
