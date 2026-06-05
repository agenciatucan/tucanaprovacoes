"use server";
import { getSupabaseServerClient, getSupabaseServiceClient } from "@/lib/supabase/server";
import {
  approvalSchema,
  approveCampaignSchema,
  type ApprovalInput,
  type ApproveCampaignInput,
} from "@/lib/validations/schemas";
import { revalidatePath } from "next/cache";
import { logger } from "@/lib/logger";
import { notifyClientRequestedAdjustment } from "@/lib/whatsapp-notifications";

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
    logger.error("submitApproval", approvalError.message);
    return { success: false, error: "Erro ao registrar aprovação" };
  }

  // Atualizar status no content_item
  // Usa serviceClient (service role) para contornar RLS — clientes não têm
  // policy de UPDATE em content_items, mas a ação é autorizada pelo check acima.
  if (parsed.data.content_item_id) {
    const serviceClient = await getSupabaseServiceClient();

    const fieldMap: Record<string, string> = {
      tema:    "theme_status",
      legenda: "caption_status",
      arte:    "artwork_status",
    };

    const field = fieldMap[parsed.data.approval_type];

    if (field) {
      // Aprovação de campo específico (tema / legenda / arte)
      const { error: updateError } = await serviceClient
        .from("content_items")
        .update({ [field]: parsed.data.status })
        .eq("id", parsed.data.content_item_id);

      if (updateError) logger.error("submitApproval/fieldUpdate", updateError.message);

      // Recalcular general_status com base nos três campos após a atualização
      const { data: updatedItem } = await serviceClient
        .from("content_items")
        .select("theme_status, caption_status, artwork_status")
        .eq("id", parsed.data.content_item_id)
        .single();

      if (updatedItem) {
        const statuses = [
          updatedItem.theme_status,
          updatedItem.caption_status,
          updatedItem.artwork_status,
        ];
        const allApproved = statuses.every((s) => s === "aprovado");
        const anyAdjust   = statuses.some((s) => s === "ajuste_solicitado" || s === "substituir_tema");
        const anyApproved = statuses.some((s) => s === "aprovado");

        let newGeneralStatus: string;
        if (allApproved)      newGeneralStatus = "aprovado";
        else if (anyAdjust)   newGeneralStatus = "em_revisao";
        else if (anyApproved) newGeneralStatus = "em_revisao"; // em progresso
        else                  newGeneralStatus = "pendente";

        await serviceClient
          .from("content_items")
          .update({ general_status: newGeneralStatus })
          .eq("id", parsed.data.content_item_id);
      }

    } else if (parsed.data.approval_type === "post_completo") {
      // Aprovação / ajuste do post inteiro — atualiza os três campos + general_status
      const subStatus = parsed.data.status; // 'aprovado' ou 'ajuste_solicitado'

      // general_status usa enum post_status — 'ajuste_solicitado' não é válido nele;
      // nesse caso usa 'em_revisao' (aguardando revisão da equipe)
      const generalStatus = subStatus === "aprovado" ? "aprovado" : "em_revisao";

      const { error: updateError } = await serviceClient
        .from("content_items")
        .update({
          theme_status:   subStatus,
          caption_status: subStatus,
          artwork_status: subStatus,
          general_status: generalStatus,
        })
        .eq("id", parsed.data.content_item_id);

      if (updateError) {
        logger.error("submitApproval/postCompleto", updateError.message);
        return { success: false, error: "Erro ao atualizar status do post" };
      }
    }

    // Salvar observação no histórico se houver
    if (parsed.data.note) {
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

    // Criar notificações para todos os admins/equipe (dentro do bloco content_item_id para serviceClient estar em escopo)
    if (profile.role === "cliente") {
      try {
        const { data: postData } = await serviceClient
          .from("content_items")
          .select("title")
          .eq("id", parsed.data.content_item_id)
          .single();

        const { data: clientProfile } = await serviceClient
          .from("user_profiles")
          .select("name")
          .eq("id", profile.id)
          .single();

        const { data: staffProfiles } = await serviceClient
          .from("user_profiles")
          .select("id")
          .in("role", ["admin", "equipe"]);

        if (staffProfiles && staffProfiles.length > 0 && postData) {
          const isApproval   = parsed.data.status === "aprovado";
          const clientName   = clientProfile?.name ?? "Cliente";
          const postTitle    = postData.title;
          const approvalType = parsed.data.approval_type;

          const FIELD_LABELS: Record<string, string> = {
            tema:          "tema",
            legenda:       "legenda",
            arte:          "arte",
            post_completo: "post",
          };
          const fieldLabel  = FIELD_LABELS[approvalType] ?? approvalType;
          const isWholePost = approvalType === "post_completo";

          const notifTitle = isApproval
            ? (isWholePost ? "Post aprovado ✓" : `${fieldLabel.charAt(0).toUpperCase() + fieldLabel.slice(1)} aprovado ✓`)
            : "Ajuste solicitado";

          const notifMessage = isApproval
            ? (isWholePost
                ? `${clientName} aprovou "${postTitle}"`
                : `${clientName} aprovou o ${fieldLabel} de "${postTitle}"`)
            : `${clientName} pediu ajuste no ${fieldLabel} de "${postTitle}"${parsed.data.note ? `: ${parsed.data.note}` : ""}`;

          // Somente notificar para ajustes (qualquer campo) e aprovação completa do post
          // Aprovações de campo individual sem ajuste são silenciosas para não poluir
          const shouldNotify = !isApproval || isWholePost;

          if (shouldNotify) {
            await serviceClient.from("notifications").insert(
              staffProfiles.map((s) => ({
                user_id:         s.id,
                client_id:       campaign.client_id,
                campaign_id:     parsed.data.campaign_id,
                content_item_id: parsed.data.content_item_id,
                type:            isApproval ? "post_aprovado" : "ajuste_solicitado",
                title:           notifTitle,
                message:         notifMessage,
              }))
            );
          }
        }
      } catch (e) {
        // Notificações são best-effort — não bloquear a aprovação
        logger.warn("submitApproval/notification", e);
      }

      // WhatsApp: confirma para o cliente a ação realizada
      try {
        const { data: postInfo } = await serviceClient
          .from("content_items")
          .select("title")
          .eq("id", parsed.data.content_item_id)
          .single();

        const postTitle = postInfo?.title ?? "post";
        const isApproval = parsed.data.status === "aprovado";

        if (!isApproval) {
          notifyClientRequestedAdjustment(parsed.data.campaign_id, postTitle).catch(() => {});
        }
      } catch (e) {
        logger.warn("submitApproval/whatsapp", e);
      }
    }
  }

  revalidatePath(`/cliente/posts/${parsed.data.content_item_id}`);
  revalidatePath(`/cliente/cronogramas/${parsed.data.campaign_id}`);
  revalidatePath(`/admin/posts/${parsed.data.content_item_id}`);
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
