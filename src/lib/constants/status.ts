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

// Labels customizados para o cliente — sobrescrevem o label padrão do
// StatusBadge quando o "kind" (cor) não corresponde ao texto desejado
// (ex.: em_producao usa a cor de "agendado", mas o texto é "Em produção").
export const CAMPAIGN_STATUS_LABEL: Record<string, string> = {
  rascunho: 'Rascunho',
  enviado_para_aprovacao: 'Aguardando aprovação',
  em_revisao: 'Em revisão',
  aprovado: 'Aprovado',
  em_producao: 'Em produção',
  finalizado: 'Finalizado',
  arquivado: 'Arquivado',
};

export const POST_STATUS_KIND: Record<string, string> = {
  pendente: 'aguardando',
  em_revisao: 'revisao',
  aprovado: 'aprovado',
  em_producao: 'agendado',
  finalizado: 'publicado',
};

// Labels customizados para o cliente — sobrescrevem o label padrão do
// StatusBadge quando o "kind" (cor) não corresponde ao texto desejado
// (ex.: em_producao usa a cor de "agendado", mas o texto é "Em produção").
export const POST_STATUS_LABEL: Record<string, string> = {
  em_producao: 'Em produção',
};
