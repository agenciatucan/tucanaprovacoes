-- ============================================================
-- MIGRAÇÃO 029 — Ciclo de vida do cronograma (auditoria AUD-003 e AUD-004)
--
-- Decisões do responsável em 2026-10-15 (docs/auditoria-projeto/decisoes-e-duvidas.md):
--   Q2 — cronograma com todos os posts publicados continua visível ao cliente.
--   Q3 — "em_producao" no post significa equipe produzindo ANTES da aprovação
--        do cliente; esses posts devem segurar a aprovação do cronograma.
--   Q7 — os cronogramas arquivados automaticamente voltam como "finalizado".
--
-- 1. fn_auto_archive_campaign passa a marcar 'finalizado' (visível ao cliente
--    no Histórico) em vez de 'arquivado'. 'arquivado' fica para ocultação
--    manual e para a inativação de cliente.
-- 2. fn_can_approve_campaign passa a tratar 'em_producao' como bloqueante.
-- 3. fn_auto_update_post_status deixa de tratar 'em_producao' como etapa
--    posterior à aprovação: se o cliente aprovar todos os campos, o post vira
--    'aprovado'.
-- 4. Dados (Q7): cronogramas 'arquivado' com todos os posts finalizados, sem
--    inativação e de cliente ativo, voltam para 'finalizado'. Um cronograma
--    concluído que o admin tenha arquivado manualmente também se encaixa
--    nesse critério — rode a consulta de conferência antes.
--
-- Conferência (rode antes):
--   SELECT c.id, c.name, c.status, c.inactivated_at, cl.status AS cliente
--   FROM campaigns c JOIN clients cl ON cl.id = c.client_id
--   WHERE c.status = 'arquivado' AND c.inactivated_at IS NULL
--     AND cl.status = 'ativo' AND fn_can_archive_campaign(c.id);
--
-- Não apaga dados.
-- ============================================================

-- ── 1. Concluir em vez de arquivar ────────────────────────────
CREATE OR REPLACE FUNCTION fn_auto_archive_campaign()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.general_status IS DISTINCT FROM OLD.general_status
     AND NEW.general_status = 'finalizado'
     AND fn_can_archive_campaign(NEW.campaign_id)
  THEN
    UPDATE campaigns
    SET status = 'finalizado'
    WHERE id = NEW.campaign_id
      AND status NOT IN ('arquivado', 'finalizado');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── 2. Post em produção segura a aprovação do cronograma ──────
CREATE OR REPLACE FUNCTION fn_can_approve_campaign(p_campaign_id UUID)
RETURNS BOOLEAN AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM content_items
    WHERE campaign_id = p_campaign_id
    AND general_status IN ('pendente', 'em_producao', 'em_revisao')
    AND is_locked = FALSE
  );
$$ LANGUAGE sql STABLE;

-- ── 3. em_producao não é etapa pós-aprovação ──────────────────
CREATE OR REPLACE FUNCTION fn_auto_update_post_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Post vai para 'aprovado' quando todos os campos estão aprovados.
  -- Não sobrescreve programado nem finalizado (já passaram da aprovação).
  IF  NEW.theme_status   = 'aprovado'
  AND NEW.caption_status = 'aprovado'
  AND NEW.artwork_status IN ('aprovado', 'nao_se_aplica')
  AND NEW.general_status NOT IN ('finalizado', 'programado')
  THEN
    NEW.general_status = 'aprovado';
  END IF;

  -- Se qualquer ajuste for solicitado, o post volta para em_revisao.
  IF  NEW.theme_status   = 'ajuste_solicitado'
   OR NEW.caption_status = 'ajuste_solicitado'
   OR NEW.artwork_status = 'ajuste_solicitado'
  THEN
    NEW.general_status = 'em_revisao';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ── 4. Dados: restaurar cronogramas concluídos (Q7) ───────────
UPDATE campaigns c
SET status = 'finalizado'
FROM clients cl
WHERE cl.id = c.client_id
  AND c.status = 'arquivado'
  AND c.inactivated_at IS NULL
  AND cl.status = 'ativo'
  AND fn_can_archive_campaign(c.id);
