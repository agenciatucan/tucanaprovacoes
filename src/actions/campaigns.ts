"use server";
// ============================================================
// SERVER ACTIONS — Cronogramas / Campaigns
// ============================================================

import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  campaignSchema,
  type CampaignInput,
} from "@/lib/validations/schemas";
import { logger } from "@/lib/logger";
import { notifyCampaignSentForApproval, notifyCampaignUpdatedForReview } from "@/lib/whatsapp-notifications";

type Result<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

async function requireStaff() {
  const supabase = await getSupabaseServerClient();

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

async function requireAdmin() {
  const supabase = await getSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from("user_profiles")
    .select("id, role")
    .eq("auth_user_id", user.id)
    .single();

  if (!data || data.role !== "admin") return null;

  return data;
}

function createApprovalToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function createTokenExpirationDate() {
  const date = new Date();
  date.setDate(date.getDate() + 30);
  return date.toISOString();
}

function revalidateCampaignPaths(campaignId: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/cronogramas");
  revalidatePath(`/admin/cronogramas/${campaignId}`);
  revalidatePath(`/admin/cronogramas/${campaignId}/editar`);
  revalidatePath("/admin/kanban");
  revalidatePath("/admin/calendario");
  revalidatePath("/cliente");
  revalidatePath(`/cliente/cronogramas/${campaignId}`);
}

// ── Criar cronograma ─────────────────────────────────────────
export async function createCampaign(
  input: CampaignInput
): Promise<Result<{ id: string }>> {
  const parsed = campaignSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Dados inválidos",
    };
  }

  const profile = await requireStaff();

  if (!profile) {
    return { success: false, error: "Sem permissão" };
  }

  const supabase = await getSupabaseServerClient();

  const approvalToken = createApprovalToken();

  const { data, error } = await supabase
    .from("campaigns")
    .insert({
      ...parsed.data,
      status: "rascunho",
      is_locked: false,
      approval_token: approvalToken,
      token_expires_at: createTokenExpirationDate(),
      created_by: profile.id,
    })
    .select("id")
    .single();

  if (error || !data) {
    logger.error("createCampaign", error);

    return {
      success: false,
      error: error?.message ?? "Erro ao criar cronograma",
    };
  }

  revalidateCampaignPaths(data.id);

  return { success: true, data: { id: data.id } };
}

// ── Atualizar cronograma ─────────────────────────────────────
export async function updateCampaign(
  id: string,
  input: CampaignInput
): Promise<Result> {
  const parsed = campaignSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Dados inválidos",
    };
  }

  const profile = await requireStaff();

  if (!profile) {
    return { success: false, error: "Sem permissão" };
  }

  const supabase = await getSupabaseServerClient();

  const { data: campaign } = await supabase
    .from("campaigns")
    .select("id, status, is_locked")
    .eq("id", id)
    .single();

  if (!campaign) {
    return { success: false, error: "Cronograma não encontrado" };
  }

  if (campaign.status === "arquivado") {
    return {
      success: false,
      error: "Este cronograma está arquivado e não pode ser editado",
    };
  }

  if (campaign.is_locked) {
    return {
      success: false,
      error: "Este cronograma está bloqueado",
    };
  }

  const { error } = await supabase
    .from("campaigns")
    .update({
      ...parsed.data,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    logger.error("updateCampaign", error.message);

    return {
      success: false,
      error: "Erro ao atualizar cronograma",
    };
  }

  revalidateCampaignPaths(id);

  return { success: true, data: undefined };
}

// ── Enviar cronograma para aprovação ─────────────────────────
export async function sendCampaignForApproval(
  campaignId: string
): Promise<Result> {
  const profile = await requireStaff();

  if (!profile) {
    return { success: false, error: "Sem permissão" };
  }

  const supabase = await getSupabaseServerClient();

  const { data: items } = await supabase
    .from("content_items")
    .select("id")
    .eq("campaign_id", campaignId);

  if (!items || items.length === 0) {
    return {
      success: false,
      error: "Adicione pelo menos um post antes de enviar para aprovação",
    };
  }

  // Guarda o status atual para saber qual notificação enviar
  const { data: current } = await supabase
    .from("campaigns")
    .select("status")
    .eq("id", campaignId)
    .single();

  const previousStatus = current?.status ?? "rascunho";

  const { error } = await supabase
    .from("campaigns")
    .update({
      status: "enviado_para_aprovacao",
      updated_at: new Date().toISOString(),
    })
    .eq("id", campaignId)
    .in("status", ["rascunho", "em_revisao"]);

  if (error) {
    logger.error("sendCampaignForApproval", error.message);

    return {
      success: false,
      error: "Erro ao enviar cronograma para aprovação",
    };
  }

  revalidateCampaignPaths(campaignId);

  // Notifica o cliente via WhatsApp com mensagem adequada ao contexto
  if (previousStatus === "em_revisao") {
    notifyCampaignUpdatedForReview(campaignId).catch(() => {});
  } else {
    notifyCampaignSentForApproval(campaignId).catch(() => {});
  }

  return { success: true, data: undefined };
}

// ── Atualizar status manualmente ─────────────────────────────
export async function updateCampaignStatus(
  campaignId: string,
  status: string
): Promise<Result> {
  const profile = await requireAdmin();

  if (!profile) {
    return {
      success: false,
      error: "Apenas admins podem alterar status manualmente",
    };
  }

  const supabase = await getSupabaseServerClient();

  const { error } = await supabase
    .from("campaigns")
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", campaignId);

  if (error) {
    logger.error("updateCampaignStatus", error.message);

    return {
      success: false,
      error: "Erro ao atualizar status",
    };
  }

  revalidateCampaignPaths(campaignId);

  return { success: true, data: undefined };
}

// ── Gerar novo link de aprovação ─────────────────────────────
export async function regenerateApprovalToken(
  campaignId: string
): Promise<Result<{ approval_token: string }>> {
  const profile = await requireStaff();

  if (!profile) {
    return { success: false, error: "Sem permissão" };
  }

  const supabase = await getSupabaseServerClient();

  const approvalToken = createApprovalToken();

  const { data, error } = await supabase
    .from("campaigns")
    .update({
      approval_token: approvalToken,
      token_expires_at: createTokenExpirationDate(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", campaignId)
    .select("approval_token")
    .single();

  if (error || !data) {
    logger.error("regenerateApprovalToken", error?.message);

    return {
      success: false,
      error: "Erro ao gerar novo link",
    };
  }

  revalidateCampaignPaths(campaignId);

  return {
    success: true,
    data: {
      approval_token: data.approval_token,
    },
  };
}

// ── Arquivar cronograma ──────────────────────────────────────
export async function archiveCampaign(campaignId: string): Promise<Result> {
  const profile = await requireAdmin();

  if (!profile) {
    return {
      success: false,
      error: "Apenas admins podem arquivar cronogramas",
    };
  }

  const supabase = await getSupabaseServerClient();

  const { data: campaign } = await supabase
    .from("campaigns")
    .select("id, status")
    .eq("id", campaignId)
    .single();

  if (!campaign) {
    return { success: false, error: "Cronograma não encontrado" };
  }

  if (campaign.status === "arquivado") {
    return {
      success: false,
      error: "Este cronograma já está arquivado",
    };
  }

  const { error } = await supabase
    .from("campaigns")
    .update({
      status: "arquivado",
      updated_at: new Date().toISOString(),
    })
    .eq("id", campaignId);

  if (error) {
    logger.error("archiveCampaign", error.message);

    return {
      success: false,
      error: "Erro ao arquivar cronograma",
    };
  }

  revalidateCampaignPaths(campaignId);

  return { success: true, data: undefined };
}