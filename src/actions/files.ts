"use server";
// ============================================================
// SERVER ACTIONS — Arquivos (files)
// Fluxo de upload:
//   1. Browser chama createSignedUploadUrl() → servidor cria URL assinada
//   2. Browser faz upload direto para a URL assinada (sem RLS)
//   3. Browser chama saveFileRecord() → servidor salva o registro no banco
// ============================================================

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { logger } from "@/lib/logger";

type Result<T = void> = { success: true; data: T } | { success: false; error: string };

async function requireStaff(supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("user_profiles").select("id, role").eq("auth_user_id", user.id).single();
  if (!data || !["admin", "equipe"].includes(data.role)) return null;
  return data;
}

// ── Criar URL assinada de upload ─────────────────────────────
// O servidor usa a service role para criar uma URL temporária (válida 60s).
// O browser faz o upload diretamente para essa URL — sem precisar de
// policies de INSERT no storage.objects.
export async function createSignedUploadUrl(
  storagePath: string,
): Promise<Result<{ signedUrl: string; token: string; path: string }>> {
  const supabase = await getSupabaseServerClient();
  const profile = await requireStaff(supabase);
  if (!profile) return { success: false, error: "Sem permissão" };

  const { data, error } = await supabase.storage
    .from("campaign-files")
    .createSignedUploadUrl(storagePath);

  if (error || !data) {
    logger.error("createSignedUploadUrl", error?.message);
    return { success: false, error: "Erro ao criar URL de upload" };
  }

  return { success: true, data: { signedUrl: data.signedUrl, token: data.token, path: data.path } };
}

// ── Salvar registro após upload bem-sucedido no Storage ──────
// O upload em si ocorre no browser (MediaUploader.tsx).
// Após o upload, o componente chama esta action com os metadados.
export async function saveFileRecord(input: {
  content_item_id: string;
  campaign_id: string;
  client_id: string;
  file_name: string;
  file_url: string;
  storage_path: string;
  file_type: "imagem" | "video" | "pdf" | "roteiro" | "referencia" | "capa";
  file_size_bytes: number;
  visible_to_client: boolean;
}): Promise<Result<{ id: string }>> {
  const supabase = await getSupabaseServerClient();
  const profile = await requireStaff(supabase);
  if (!profile) return { success: false, error: "Sem permissão" };

  const { data, error } = await supabase
    .from("files")
    .insert({ ...input, uploaded_by: profile.id })
    .select("id")
    .single();

  if (error || !data) {
    logger.error("saveFileRecord", error?.message);
    return { success: false, error: "Erro ao salvar registro do arquivo" };
  }

  revalidatePath(`/admin/posts/${input.content_item_id}`);
  return { success: true, data: { id: data.id } };
}

// ── Excluir arquivo (Storage + banco) ───────────────────────
// Busca o storage_path no banco, remove do Storage, remove o registro.
export async function deleteFile(
  fileId: string,
  contentItemId: string,
): Promise<Result> {
  const supabase = await getSupabaseServerClient();
  const profile = await requireStaff(supabase);
  if (!profile) return { success: false, error: "Sem permissão" };

  // Buscar storage_path para remover do bucket
  const { data: fileRow } = await supabase
    .from("files")
    .select("storage_path")
    .eq("id", fileId)
    .single();

  if (fileRow?.storage_path) {
    const { error: storageErr } = await supabase.storage
      .from("campaign-files")
      .remove([fileRow.storage_path]);

    if (storageErr) {
      // Logar mas não bloquear — o registro do banco será removido de qualquer forma
      logger.error("deleteFile/storage", storageErr.message);
    }
  }

  const { error } = await supabase.from("files").delete().eq("id", fileId);
  if (error) return { success: false, error: "Erro ao remover arquivo" };

  revalidatePath(`/admin/posts/${contentItemId}`);
  return { success: true, data: undefined };
}

// ── Alternar visibilidade para o cliente ─────────────────────
export async function toggleFileVisibility(
  fileId: string,
  contentItemId: string,
  visible: boolean,
): Promise<Result> {
  const supabase = await getSupabaseServerClient();
  const profile = await requireStaff(supabase);
  if (!profile) return { success: false, error: "Sem permissão" };

  const { error } = await supabase
    .from("files")
    .update({ visible_to_client: visible })
    .eq("id", fileId);

  if (error) return { success: false, error: "Erro ao atualizar visibilidade" };

  revalidatePath(`/admin/posts/${contentItemId}`);
  return { success: true, data: undefined };
}
