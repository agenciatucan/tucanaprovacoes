-- ============================================================
-- MIGRAÇÃO 022 — Corrige fn_can_approve_campaign() para
-- reconhecer o status 'programado' (adicionado na migração 010)
-- como já aprovado.
--
-- Causa raiz: fn_can_approve_campaign() foi escrita na migração
-- 001, antes de 'programado' existir, e só tratava
-- general_status IN ('aprovado', 'finalizado') como aprovado.
-- Isso fazia com que qualquer post já agendado na ferramenta de
-- publicação ('programado') bloqueasse indefinidamente a
-- promoção do cronograma para 'aprovado' — mesmo ele já tendo
-- passado da etapa de aprovação.
--
-- Correção: em vez de listar os status "aprovados" (que ficam
-- desatualizados a cada novo status adicionado ao enum), passa
-- a bloquear apenas pelos status que realmente significam
-- "ainda não decidido": 'pendente' e 'em_revisao'.
-- ============================================================

CREATE OR REPLACE FUNCTION fn_can_approve_campaign(p_campaign_id UUID)
RETURNS BOOLEAN AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM content_items
    WHERE campaign_id = p_campaign_id
    AND general_status IN ('pendente', 'em_revisao')
    AND is_locked = FALSE
  );
$$ LANGUAGE sql STABLE;

-- Reaplica o backfill da migração 021 com a função corrigida,
-- para pegar cronogramas que ficaram presos só por causa do
-- 'programado' (ex.: "Junho | 2026").
UPDATE campaigns c
SET status = 'aprovado', is_locked = TRUE
WHERE c.status IN ('enviado_para_aprovacao', 'em_revisao')
  AND fn_can_approve_campaign(c.id);
