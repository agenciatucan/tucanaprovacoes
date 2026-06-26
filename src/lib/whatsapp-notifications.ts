import { sendWhatsApp } from "@/lib/zapi";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

// Busca o número de WhatsApp do cliente vinculado a um cronograma
async function getClientWhatsApp(campaignId: string): Promise<{ phone: string; name: string; campaignName: string } | null> {
  const serviceClient = await getSupabaseServiceClient();

  const { data } = await serviceClient
    .from("campaigns")
    .select("name, clients(name, company_name, whatsapp)")
    .eq("id", campaignId)
    .single();

  if (!data) return null;

  const client = Array.isArray(data.clients) ? data.clients[0] : data.clients;
  if (!client?.whatsapp) return null;

  return {
    phone:        client.whatsapp,
    name:         client.company_name ?? client.name ?? "Cliente",
    campaignName: data.name,
  };
}

// Disparado quando a equipe envia o planejamento de temas para aprovação
export async function notifyPlanningForApproval(planningId: string) {
  try {
    const serviceClient = await getSupabaseServiceClient();

    const { data } = await serviceClient
      .from("planning_schedules")
      .select("title, month_year, approval_token, clients(name, company_name, whatsapp)")
      .eq("id", planningId)
      .single();

    if (!data) return;
    const client = Array.isArray(data.clients) ? data.clients[0] : data.clients;
    if (!client?.whatsapp) return;

    const clientName = client.company_name ?? client.name ?? "Cliente";
    const [year, month] = (data.month_year as string).split("-");
    const monthLabel = new Date(Number(year), Number(month) - 1, 1)
      .toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://tucanaprovacoes.vercel.app";
    const link   = `${appUrl}/acesso/planejamento/${data.approval_token}`;

    const message =
      `Olá, ${clientName}! 🎯\n\n` +
      `O planejamento de temas *${data.title}* para ${monthLabel} está pronto para sua aprovação.\n\n` +
      `Acesse o link abaixo para visualizar os temas propostos e aprovar ou solicitar ajustes:\n` +
      `${link}`;

    await sendWhatsApp(client.whatsapp as string, message);
  } catch (err) {
    logger.error("notifyPlanningForApproval", String(err));
  }
}

// Disparado quando a equipe envia o cronograma para aprovação
export async function notifyCampaignSentForApproval(campaignId: string) {
  try {
    const info = await getClientWhatsApp(campaignId);
    if (!info) return;

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://tucanaprovacoes.vercel.app";
    const link   = `${appUrl}/cliente/cronogramas/${campaignId}`;

    const message =
      `Olá, ${info.name}! 👋\n\n` +
      `O cronograma *${info.campaignName}* está disponível para sua revisão no Portal Tucan.\n\n` +
      `Acesse abaixo para visualizar os posts, aprovar ou solicitar ajustes:\n` +
      `${link}`;

    await sendWhatsApp(info.phone, message);
  } catch (err) {
    logger.error("notifyCampaignSentForApproval", String(err));
  }
}

// Disparado quando o cliente aprova um post
export async function notifyClientApproved(campaignId: string, postTitle: string) {
  try {
    const info = await getClientWhatsApp(campaignId);
    if (!info) return;

    const message =
      `✅ *Aprovação registrada!*\n\n` +
      `Recebemos sua aprovação do post *${postTitle}* no cronograma *${info.campaignName}*.\n\n` +
      `Obrigado por revisar! 🙌`;

    await sendWhatsApp(info.phone, message);
  } catch (err) {
    logger.error("notifyClientApproved", String(err));
  }
}

// Disparado quando a equipe sobe alterações após ajuste solicitado
export async function notifyCampaignUpdatedForReview(campaignId: string) {
  try {
    const info = await getClientWhatsApp(campaignId);
    if (!info) return;

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://portal.agenciatucan.com.br";
    const link   = `${appUrl}/cliente/cronogramas/${campaignId}`;

    const message =
      `Olá, ${info.name}! 🔄\n\n` +
      `As alterações solicitadas no cronograma *${info.campaignName}* foram realizadas e estão prontas para sua análise.\n\n` +
      `Acesse abaixo para revisar e aprovar:\n` +
      `${link}`;

    await sendWhatsApp(info.phone, message);
  } catch (err) {
    logger.error("notifyCampaignUpdatedForReview", String(err));
  }
}

// Disparado quando a equipe envia um lembrete de aprovação pendente ao cliente
export async function notifyClientReminder(campaignId: string, pendingCount: number) {
  try {
    const info = await getClientWhatsApp(campaignId);
    if (!info) return;

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://tucanaprovacoes.vercel.app";
    const link   = `${appUrl}/cliente/cronogramas/${campaignId}`;

    const postWord = pendingCount === 1 ? "conteúdo" : "conteúdos";

    const message =
      `Olá, ${info.name}! 🔔\n\n` +
      `Você ainda tem *${pendingCount} ${postWord}* aguardando sua aprovação no cronograma *${info.campaignName}*.\n\n` +
      `Acesse o link abaixo para revisar e aprovar:\n` +
      `${link}`;

    await sendWhatsApp(info.phone, message);
  } catch (err) {
    logger.error("notifyClientReminder", String(err));
  }
}

// Disparado quando o cliente solicita ajuste em um post
export async function notifyClientRequestedAdjustment(campaignId: string, postTitle: string) {
  try {
    const info = await getClientWhatsApp(campaignId);
    if (!info) return;

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://tucanaprovacoes.vercel.app";
    const link   = `${appUrl}/cliente/cronogramas/${campaignId}`;

    const message =
      `🔄 *Pedido de ajuste recebido!*\n\n` +
      `Recebemos seu pedido de ajuste no post *${postTitle}* do cronograma *${info.campaignName}*.\n\n` +
      `Nossa equipe vai analisar e retornar em breve!\n\n` +
      `Acompanhe pelo portal:\n${link}`;

    await sendWhatsApp(info.phone, message);
  } catch (err) {
    logger.error("notifyClientRequestedAdjustment", String(err));
  }
}
