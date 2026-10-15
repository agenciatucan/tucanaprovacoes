export const CLIENT_VISIBLE_CAMPAIGN_STATUSES = [
  'enviado_para_aprovacao',
  'em_revisao',
  'aprovado',
  'em_producao',
  'finalizado',
] as const;

// Cronogramas em andamento: listados na tela inicial e em "Aprovados" do cliente.
// 'finalizado' (todos os posts publicados) continua acessível, mas só aparece
// no "Histórico" (decisão de 2026-10-15 — docs/auditoria-projeto, AUD-003).
export const CLIENT_ACTIVE_CAMPAIGN_STATUSES = CLIENT_VISIBLE_CAMPAIGN_STATUSES.filter(
  (status) => status !== 'finalizado'
);

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
  programado: 'agendado',
  finalizado: 'publicado',
};

// Rótulo único do status geral do post para as telas da equipe
// (dashboard, seletor de status). docs/auditoria-projeto, AUD-008.
export const POST_GENERAL_STATUS_LABEL: Record<string, string> = {
  pendente: 'Aguardando aprovação',
  em_producao: 'Em produção',
  em_revisao: 'Ajuste solicitado',
  aprovado: 'Aprovado',
  programado: 'Programado',
  finalizado: 'Concluído',
};

const ADJUSTMENT_FIELD_STATUSES = ['ajuste_solicitado', 'substituir_tema'];

// Status geral do post a partir de tema/legenda/arte (AUD-005/AUD-013).
// Mesma regra do trigger fn_auto_update_post_status:
//   - algum ajuste pedido          → 'em_revisao' (a equipe precisa agir)
//   - tudo aprovado (arte pode ser 'nao_se_aplica') → 'aprovado'
//   - caso contrário (inclui aprovação parcial) → 'pendente' (aguarda o cliente)
export function computePostGeneralStatus(
  themeStatus: string | null | undefined,
  captionStatus: string | null | undefined,
  artworkStatus: string | null | undefined
): 'em_revisao' | 'aprovado' | 'pendente' {
  const statuses = [themeStatus, captionStatus, artworkStatus];
  if (statuses.some((s) => ADJUSTMENT_FIELD_STATUSES.includes(s ?? ''))) return 'em_revisao';
  if (
    themeStatus === 'aprovado' &&
    captionStatus === 'aprovado' &&
    (artworkStatus === 'aprovado' || artworkStatus === 'nao_se_aplica')
  ) {
    return 'aprovado';
  }
  return 'pendente';
}

export const POST_STATUS_LABEL: Record<string, string> = {
  em_producao: 'Em produção',
  programado: 'Programado',
};
