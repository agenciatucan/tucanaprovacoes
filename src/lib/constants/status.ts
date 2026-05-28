export const CLIENT_VISIBLE_CAMPAIGN_STATUSES = [
  'enviado_para_aprovacao',
  'em_revisao',
  'aprovado',
  'em_producao',
  'finalizado',
] as const;

export const HIDDEN_FROM_CLIENT_CAMPAIGN_STATUSES = [
  'rascunho',
  'arquivado',
] as const;

export type ClientVisibleCampaignStatus =
  (typeof CLIENT_VISIBLE_CAMPAIGN_STATUSES)[number];

export function isCampaignVisibleToClient(status?: string | null) {
  return CLIENT_VISIBLE_CAMPAIGN_STATUSES.includes(
    status as ClientVisibleCampaignStatus
  );
}

export const CAMPAIGN_STATUS_KIND: Record<string, string> = {
  rascunho: 'rascunho',
  enviado_para_aprovacao: 'aguardando',
  em_revisao: 'revisao',
  aprovado: 'aprovado',
  em_producao: 'agendado',
  finalizado: 'publicado',
  arquivado: 'rascunho',
};

export const POST_STATUS_KIND: Record<string, string> = {
  pendente: 'aguardando',
  em_revisao: 'revisao',
  aprovado: 'aprovado',
  em_producao: 'agendado',
  finalizado: 'publicado',
};
