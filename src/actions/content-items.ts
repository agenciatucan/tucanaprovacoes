"use server";
// ============================================================
// SERVER ACTIONS — Posts / Content Items
// ============================================================

import { getSupabaseServerClient, getSupabaseServiceClient } from "@/lib/supabase/server";
import {
  contentItemSchema,
  type ContentItemInput,
} from "@/lib/validations/schemas";
import { revalidatePath } from "next/cache";
import { logger } from "@/lib/logger";
import { computePostGeneralStatus } from "@/lib/constants/status";
import { promoteIfReadyForApproval } from "@/lib/posts/production";
import {
  CAMPAIGN_FILES_BUCKET,
  collectCampaignFilePaths,
  removeStorageObjects,
} from "@/lib/storage/cleanup";

type Result<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

async function requireStaff(
  supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from("user_profiles")
    .select("id, role")
    .eq("auth_user_id", user.id)
    .single();

  if (!data || !["admin", "equipe"].includes(data.role)) return null;

  return data;
}

// Busca o próximo order_index disponível para a campanha
async function getNextOrderIndex(
  supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>,
  campaignId: string
) {
  const { data } = await supabase
    .from("content_items")
    .select("order_index")
    .eq("campaign_id", campaignId)
    .order("order_index", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data?.order_index ?? -1) + 1;
}

// Campos de conteúdo que o cliente aprova. Editar um deles depois de aprovado
// devolve o campo para aprovação (decisão Q5 — docs/auditoria-projeto, AUD-006).
const APPROVED_CONTENT_FIELDS = [
  { field: "theme", status: "theme_status", label: "tema" },
  { field: "caption", status: "caption_status", label: "legenda" },
  { field: "script", status: "caption_status", label: "roteiro" },
] as const;

// Ação da equipe que devolve um post para aprovação reabre o cronograma já
// aprovado/bloqueado, para o cliente poder aprovar de novo. O cliente não reabre
// sozinho (decisões Q4 e Q6 — AUD-002). Retorna se o cronograma foi reaberto.
async function reopenApprovedCampaign(
  supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>,
  campaignId: string
) {
  const { data, error } = await supabase
    .from("campaigns")
    .update({ is_locked: false, status: "em_revisao" })
    .eq("id", campaignId)
    .or("is_locked.eq.true,status.eq.aprovado")
    .neq("status", "arquivado")
    .select("id");

  if (error) logger.error("reopenApprovedCampaign", error.message);

  return (data?.length ?? 0) > 0;
}

export async function createContentItem(
  input: ContentItemInput
): Promise<Result<{ id: string }>> {
  const parsed = contentItemSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Dados inválidos",
    };
  }

  const supabase = await getSupabaseServerClient();
  const profile = await requireStaff(supabase);

  if (!profile) {
    return { success: false, error: "Sem permissão" };
  }

  // Buscar client_id da campanha
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("client_id")
    .eq("id", parsed.data.campaign_id)
    .single();

  if (!campaign) {
    return { success: false, error: "Cronograma não encontrado" };
  }

  // Sempre calcula o próximo índice disponível para evitar violação de
  // UNIQUE (campaign_id, order_index) — o form começa em 0, mas pode já existir
  const orderIndex = await getNextOrderIndex(
    supabase,
    parsed.data.campaign_id
  );

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
    logger.error("createContentItem", { message: error?.message, code: error?.code });

    return {
      success: false,
      error: error?.message ?? "Erro ao criar post",
    };
  }

  revalidatePath(`/admin/cronogramas/${parsed.data.campaign_id}`);

  return { success: true, data: { id: data.id } };
}

export async function updateContentItem(
  id: string,
  input: ContentItemInput
): Promise<Result<{ sentBackToApproval: boolean; campaignReopened: boolean; leftProduction: boolean }>> {
  const parsed = contentItemSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Dados inválidos",
    };
  }

  const supabase = await getSupabaseServerClient();
  const profile = await requireStaff(supabase);

  if (!profile) {
    return { success: false, error: "Sem permissão" };
  }

  const { campaign_id, ...updateData } = parsed.data;

  const { data: current } = await supabase
    .from("content_items")
    .select("campaign_id, client_id, theme, caption, script, theme_status, caption_status, artwork_status, general_status")
    .eq("id", id)
    .single();

  if (!current) {
    return { success: false, error: "Post não encontrado" };
  }

  // Campo aprovado que teve o texto alterado volta para "aguardando" (Q5).
  // Post já publicado (finalizado) é só correção de registro: não volta.
  const statusUpdates: Record<string, string> = {};
  const editedLabels: string[] = [];

  if (current.general_status !== "finalizado") {
    for (const { field, status, label } of APPROVED_CONTENT_FIELDS) {
      const before = (current[field] ?? "").trim();
      const after = (updateData[field] ?? "").trim();
      if (before !== after && current[status] === "aprovado") {
        statusUpdates[status] = "aguardando";
        editedLabels.push(label);
      }
    }
  }

  const sentBackToApproval = editedLabels.length > 0;

  if (sentBackToApproval && current.general_status !== "em_producao") {
    statusUpdates.general_status = computePostGeneralStatus(
      statusUpdates.theme_status ?? current.theme_status,
      statusUpdates.caption_status ?? current.caption_status,
      current.artwork_status
    );
  }

  const { error } = await supabase
    .from("content_items")
    .update({ ...updateData, ...statusUpdates })
    .eq("id", id);

  if (error) {
    logger.error("updateContentItem", { message: error.message, code: error.code });

    return {
      success: false,
      error: error.message ?? "Erro ao atualizar post",
    };
  }

  // Post em produção com legenda + arquivo visível passa a aguardar aprovação.
  const leftProduction = await promoteIfReadyForApproval(supabase, id);

  let campaignReopened = false;

  if (sentBackToApproval) {
    // Service role: a policy de INSERT em comments_history exige vínculo com o cliente,
    // que admin/equipe não têm. Permissão já verificada por requireStaff.
    const serviceClient = await getSupabaseServiceClient();
    const { error: historyError } = await serviceClient.from("comments_history").insert({
      content_item_id: id,
      campaign_id: current.campaign_id,
      client_id: current.client_id,
      user_id: profile.id,
      message: `Equipe alterou ${editedLabels.join(", ")} após a aprovação; enviado novamente para aprovação.`,
      status: "resolvida",
      resolved_at: new Date().toISOString(),
      resolved_by: profile.id,
    });

    if (historyError) logger.warn("updateContentItem/history", historyError.message);

    campaignReopened = await reopenApprovedCampaign(supabase, current.campaign_id);
  }

  revalidatePath(`/admin/cronogramas/${campaign_id}`);
  revalidatePath(`/admin/posts/${id}`);
  revalidatePath(`/cliente/posts/${id}`);
  revalidatePath(`/cliente/cronogramas/${current.campaign_id}`);

  return { success: true, data: { sentBackToApproval, campaignReopened, leftProduction } };
}

export async function deleteContentItem(id: string): Promise<Result> {
  const supabase = await getSupabaseServerClient();
  const profile = await requireStaff(supabase);

  if (!profile) {
    return { success: false, error: "Sem permissão" };
  }

  // Buscar campaign_id antes de deletar para revalidar
  const { data: item } = await supabase
    .from("content_items")
    .select("campaign_id")
    .eq("id", id)
    .single();

  // Coleta os arquivos antes de excluir (o cascade apaga as linhas de `files`) — AUD-010.
  const filePaths = await collectCampaignFilePaths("content_item_id", id);

  const { error } = await supabase
    .from("content_items")
    .delete()
    .eq("id", id);

  if (error) {
    return { success: false, error: "Erro ao excluir post" };
  }

  await removeStorageObjects(CAMPAIGN_FILES_BUCKET, filePaths);

  if (item?.campaign_id) {
    revalidatePath(`/admin/cronogramas/${item.campaign_id}`);
  }

  return { success: true, data: undefined };
}

export async function updateContentItemStatus(
  id: string,
  field:
    | "theme_status"
    | "caption_status"
    | "artwork_status"
    | "general_status",
  value: string
): Promise<Result> {
  const supabase = await getSupabaseServerClient();
  const profile = await requireStaff(supabase);

  if (!profile) {
    return { success: false, error: "Sem permissão" };
  }

  const { data: item } = await supabase
    .from("content_items")
    .select("campaign_id, theme_status, caption_status, artwork_status")
    .eq("id", id)
    .single();

  const updates: Record<string, string> = { [field]: value };

  // O trigger fn_auto_update_post_status força general_status = 'em_revisao'
  // enquanto tema/legenda/arte estiverem com ajuste solicitado. Quando a equipe
  // avança o post manualmente além da aprovação (ex.: cliente aprovou fora do
  // portal), esses campos passam a 'aprovado' — senão o banco desfaz a mudança.
  const PAST_APPROVAL = ["aprovado", "em_producao", "programado", "finalizado"];
  const NEEDS_RESOLVE = ["ajuste_solicitado", "substituir_tema"];

  if (field === "general_status" && item && PAST_APPROVAL.includes(value)) {
    if (NEEDS_RESOLVE.includes(item.theme_status)) updates.theme_status = "aprovado";
    if (NEEDS_RESOLVE.includes(item.caption_status)) updates.caption_status = "aprovado";
    if (NEEDS_RESOLVE.includes(item.artwork_status)) updates.artwork_status = "aprovado";
  }

  const { data: saved, error } = await supabase
    .from("content_items")
    .update(updates)
    .eq("id", id)
    .select(field)
    .maybeSingle();

  if (error) {
    return { success: false, error: "Erro ao atualizar status" };
  }

  // Confere o valor gravado: triggers podem sobrescrever a mudança.
  if (!saved || (saved as Record<string, string>)[field] !== value) {
    return { success: false, error: "O status não pôde ser alterado. Atualize a página e tente novamente." };
  }

  if (item?.campaign_id) {
    revalidatePath(`/admin/cronogramas/${item.campaign_id}`);
  }

  revalidatePath(`/admin/posts/${id}`);
  revalidatePath(`/admin/kanban`);

  return { success: true, data: undefined };
}

// ── Marcar post como programado (agendado na ferramenta) ─────
// Retorna void para poder ser usada diretamente como form action.
export async function markPostAsScheduled(id: string): Promise<void> {
  const supabase = await getSupabaseServerClient();
  const profile = await requireStaff(supabase);
  if (!profile) return;

  const { data: item } = await supabase
    .from('content_items')
    .select('campaign_id, general_status')
    .eq('id', id)
    .single();

  if (!item || item.general_status !== 'aprovado') return;

  const { error } = await supabase
    .from('content_items')
    .update({ general_status: 'programado' })
    .eq('id', id);

  if (error) {
    logger.error('markPostAsScheduled', error.message);
    return;
  }

  revalidatePath(`/admin/kanban`);
  revalidatePath(`/admin/cronogramas/${item.campaign_id}`);
  revalidatePath(`/admin/posts/${id}`);
}

// ── Marcar post como finalizado (publicado) ──────────────────
export async function markPostAsFinished(id: string): Promise<void> {
  const supabase = await getSupabaseServerClient();
  const profile = await requireStaff(supabase);
  if (!profile) return;

  const { data: item } = await supabase
    .from('content_items')
    .select('campaign_id, general_status')
    .eq('id', id)
    .single();

  if (!item || item.general_status !== 'programado') return;

  const { error } = await supabase
    .from('content_items')
    .update({ general_status: 'finalizado' })
    .eq('id', id);

  if (error) {
    logger.error('markPostAsFinished', error.message);
    return;
  }

  revalidatePath(`/admin/kanban`);
  revalidatePath(`/admin/cronogramas/${item.campaign_id}`);
  revalidatePath(`/admin/posts/${id}`);
}

// ── Edição rápida de um campo em ajuste (painel de reenvio) ──
// Corrige só o tema ou a legenda direto no painel de ajuste, sem
// precisar abrir o formulário completo de edição.
const QUICK_ADJUST_FIELDS = ["theme", "caption"] as const;
type QuickAdjustField = (typeof QUICK_ADJUST_FIELDS)[number];

export async function updatePostQuickField(
  id: string,
  field: QuickAdjustField,
  value: string
): Promise<Result> {
  if (!QUICK_ADJUST_FIELDS.includes(field)) {
    return { success: false, error: "Campo inválido" };
  }

  const maxLength = field === "caption" ? 3000 : 500;
  if (value.length > maxLength) {
    return { success: false, error: `Texto muito longo (máx. ${maxLength} caracteres)` };
  }

  const supabase = await getSupabaseServerClient();
  const profile = await requireStaff(supabase);

  if (!profile) {
    return { success: false, error: "Sem permissão" };
  }

  const { data: item, error } = await supabase
    .from("content_items")
    .update({ [field]: value.trim() || null })
    .eq("id", id)
    .select("campaign_id")
    .single();

  if (error || !item) {
    logger.error("updatePostQuickField", { message: error?.message, code: error?.code });
    return { success: false, error: "Erro ao salvar" };
  }

  revalidatePath(`/admin/cronogramas/${item.campaign_id}`);
  revalidatePath(`/admin/posts/${id}`);

  return { success: true, data: undefined };
}

// ── Reenviar post para aprovação do cliente ──────────────────
// Reseta os campos com ajuste_solicitado de volta para aguardando,
// mantendo os que já foram aprovados. Recalcula o general_status.
// Também resolve automaticamente as observações abertas desse post
// e registra no histórico do card que o ajuste foi realizado.
export async function resendForApproval(id: string): Promise<Result<{ campaignReopened: boolean }>> {
  const supabase = await getSupabaseServerClient();
  const profile = await requireStaff(supabase);

  if (!profile) {
    return { success: false, error: "Sem permissão" };
  }

  const { data: item } = await supabase
    .from("content_items")
    .select(
      "campaign_id, client_id, theme_status, caption_status, artwork_status"
    )
    .eq("id", id)
    .single();

  if (!item) {
    return { success: false, error: "Post não encontrado" };
  }

  const NEEDS_RESET = ["ajuste_solicitado", "substituir_tema"];

  const updates: Record<string, string> = {};

  if (NEEDS_RESET.includes(item.theme_status)) {
    updates.theme_status = "aguardando";
  }

  if (NEEDS_RESET.includes(item.caption_status)) {
    updates.caption_status = "aguardando";
  }

  if (NEEDS_RESET.includes(item.artwork_status)) {
    updates.artwork_status = "aguardando";
  }

  // Se houver campos com ajuste, atualiza o post.
  // Se não houver, continua mesmo assim para resolver observações abertas
  // e registrar o ajuste no histórico.
  if (Object.keys(updates).length > 0) {
    const newTheme = updates.theme_status ?? item.theme_status;
    const newCaption = updates.caption_status ?? item.caption_status;
    const newArtwork = updates.artwork_status ?? item.artwork_status;

    // Ajustes resolvidos: volta a aguardar o cliente (AUD-005), mesmo com campos já aprovados.
    const generalStatus = computePostGeneralStatus(newTheme, newCaption, newArtwork);

    const { error } = await supabase
      .from("content_items")
      .update({
        ...updates,
        general_status: generalStatus,
      })
      .eq("id", id);

    if (error) {
      logger.error("resendForApproval", error.message);

      return {
        success: false,
        error: "Erro ao reenviar para aprovação",
      };
    }
  }

  // Resolver automaticamente as observações abertas desse post.
  // Importante: isso roda mesmo se o post já tiver sido reenviado antes.
  const { error: resolveCommentsError } = await supabase
    .from("comments_history")
    .update({
      status: "resolvida",
      resolved_at: new Date().toISOString(),
      resolved_by: profile.id,
    })
    .eq("content_item_id", id)
    .eq("status", "aberta");

  if (resolveCommentsError) {
    logger.warn("resendForApproval/resolveComments", resolveCommentsError.message);

    return {
      success: false,
      error: "Post reenviado, mas houve erro ao resolver observações",
    };
  }

  // Registrar no histórico do card que a equipe realizou o ajuste.
  // Esse registro aparece no histórico do post, mas não entra como observação aberta.
  // Service role: a policy de INSERT exige vínculo com o cliente, que a equipe não tem.
  const serviceClient = await getSupabaseServiceClient();
  const { error: historyError } = await serviceClient
    .from("comments_history")
    .insert({
      content_item_id: id,
      campaign_id: item.campaign_id,
      client_id: item.client_id,
      user_id: profile.id,
      message: "Ajuste realizado e reenviado para aprovação.",
      status: "resolvida",
      resolved_at: new Date().toISOString(),
      resolved_by: profile.id,
    });

  if (historyError) {
    logger.warn("resendForApproval/history", historyError.message);
  }

  // Cronograma aprovado/bloqueado volta para "em revisão" para o cliente poder aprovar (Q6).
  const campaignReopened = await reopenApprovedCampaign(supabase, item.campaign_id);

  revalidatePath(`/admin/posts/${id}`);
  revalidatePath(`/admin/cronogramas/${item.campaign_id}`);
  revalidatePath(`/admin/observacoes`);
  revalidatePath(`/admin`);
  revalidatePath(`/cliente/posts/${id}`);
  revalidatePath(`/cliente/cronogramas/${item.campaign_id}`);

  return { success: true, data: { campaignReopened } };
}