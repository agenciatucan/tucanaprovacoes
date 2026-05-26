"use server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  approvalSchema,
  approveCampaignSchema,
  type ApprovalInput,
  type ApproveCampaignInput,
} from "@/lib/validations/schemas";
import { revalidatePath } from "next/cache";

type Result<T = void> = { success: true; data: T } | { success: false; error: string };

export async function submitApproval(input: ApprovalInput): Promise<Result> {
  const parsed = approvalSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Não autorizado" };

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("id, role")
    .eq("auth_user_id", user.id)
    .single();
  if (!profile) return { success: false, error: "Perfil não encontrado" };

  // Buscar cronograma e validar acesso
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("client_id, is_locked, status")
    .eq("id", parsed.data.campaign_id)
    .single();

  if (!campaign) return { success: false, error: "Cronograma não encontrado" };
  if (campaign.is_locked) return { success: false, error: "Este cronograma está bloqueado" };

  // Cliente só pode aprovar seus próprios cronogramas
  if (profile.role === "cliente") {
    const { data: clientUser } = await supabase
      .from("client_users")
      .select("id")
      .eq("user_id", profile.id)
      .eq("client_id", campaign.client_id)
      .maybeSingle();

    if (!clientUser) return { success: false, error: "Sem permissão para este cronograma" };
  }

  // Registrar aprovação (registro imutável)
  const { error: approvalError } = await supabase.from("approvals").insert({
    content_item_id: parsed.data.content_item_id ?? null,
    campaign_id:     parsed.data.campaign_id,
    client_id:       campaign.client_id,
    approval_type:   parsed.data.approval_type,
    status:          parsed.data.status,
    note:            parsed.data.note ?? null,
    approved_by:     profile.id,
  });

  if (approvalError) {
    console.error("[submitApproval]", approvalError.message);
    return { success: false, error: "Erro ao registrar aprovação" };
  }

  // Atualizar status no content_item
  if (parsed.data.content_item_id) {
    const fieldMap = {
      tema:    "theme_status",
      legenda: "caption_status",
      arte:    "artwork_status",
    } as const;

    const field = fieldMap[parsed.data.approval_type as keyof typeof fieldMap];
    if (field) {
      await supabase
        .from("content_items")
        .update({ [field]: parsed.data.status })
        .eq("id", parsed.data.content_item_id)
        .eq("client_id", campaign.client_id);
      // O trigger fn_auto_update_post_status cuida do general_status automaticamente
    }

    // Salvar observação no histórico se houver
    if (parsed.data.note) {
      // Buscar snapshot atual dos status
      const { data: item } = await supabase
        .from("content_items")
        .select("theme_status, caption_status, artwork_status")
        .eq("id", parsed.data.content_item_id)
        .single();

      await supabase.from("comments_history").insert({
        content_item_id:         parsed.data.content_item_id,
        campaign_id:             parsed.data.campaign_id,
        client_id:               campaign.client_id,
        user_id:                 profile.id,
        message:                 parsed.data.note,
        status:                  "aberta",
        snapshot_theme_status:   item?.theme_status ?? null,
        snapshot_caption_status: item?.caption_status ?? null,
        snapshot_artwork_status: item?.artwork_status ?? null,
      });
    }
  }

  revalidatePath(`/cliente/cronogramas/${parsed.data.campaign_id}`);
  revalidatePath(`/admin/cronogramas/${parsed.data.campaign_id}`);
  return { success: true, data: undefined };
}

// Aprovação completa do cronograma (PDF seção 9.4)
export async function approveCampaign(input: ApproveCampaignInput): Promise<Result> {
  const parsed = approveCampaignSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Dados inválidos" };

  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Não autorizado" };

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("id, role")
    .eq("auth_user_id", user.id)
    .single();
  if (!profile) return { success: false, error: "Perfil não encontrado" };

  // Verificar se todos os posts estão aprovados (usando função do banco)
  const { data: canApprove } = await supabase
    .rpc("fn_can_approve_campaign", { p_campaign_id: parsed.data.campaign_id });

  if (!canApprove && profile.role !== "admin") {
    return {
      success: false,
      error: "Ainda há posts pendentes de aprovação. Aprove todos os itens antes de aprovar o cronograma.",
    };
  }

  // Registrar aprovação do cronograma
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("client_id")
    .eq("id", parsed.data.campaign_id)
    .single();

  if (!campaign) return { success: false, error: "Cronograma não encontrado" };

  await supabase.from("approvals").insert({
    campaign_id:   parsed.data.campaign_id,
    client_id:     campaign.client_id,
    approval_type: "cronograma",
    status:        "aprovado",
    note:          parsed.data.note ?? null,
    approved_by:   profile.id,
  });

  // Atualizar status e bloquear cronograma
  await supabase
    .from("campaigns")
    .update({ status: "aprovado", is_locked: true })
    .eq("id", parsed.data.campaign_id);

  revalidatePath(`/cliente/cronogramas/${parsed.data.campaign_id}`);
  revalidatePath("/admin/cronogramas");
  return { success: true, data: undefined };
}
