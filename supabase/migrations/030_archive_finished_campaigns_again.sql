-- ============================================================
-- MIGRAÇÃO 030 — Cronograma concluído volta a ser arquivado (oculto do cliente)
--
-- Decisão do responsável em 2026-10-15, revisando a Q2 da auditoria
-- (docs/auditoria-projeto/decisoes-e-duvidas.md): cronogramas com todos os
-- posts publicados devem ficar OCULTOS para o cliente.
--
-- Reverte só a parte 1 e a parte 4 da migração 029. As partes 2 e 3 da 029
-- (post 'em_producao' segura a aprovação automática) continuam valendo.
--
-- 1. fn_auto_archive_campaign volta a marcar 'arquivado'.
-- 2. Dados: cronogramas 'finalizado' com todos os posts finalizados voltam a
--    'arquivado'. Hoje são exatamente os 2 restaurados pela 029 (antes dela
--    não havia nenhum cronograma 'finalizado').
--
-- Conferência (rode antes):
--   SELECT id, name, status FROM campaigns
--   WHERE status = 'finalizado' AND fn_can_archive_campaign(id);
--
-- Não apaga dados.
-- ============================================================

CREATE OR REPLACE FUNCTION fn_auto_archive_campaign()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.general_status IS DISTINCT FROM OLD.general_status
     AND NEW.general_status = 'finalizado'
     AND fn_can_archive_campaign(NEW.campaign_id)
  THEN
    UPDATE campaigns
    SET status = 'arquivado'
    WHERE id = NEW.campaign_id
      AND status NOT IN ('arquivado', 'finalizado');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

UPDATE campaigns
SET status = 'arquivado'
WHERE status = 'finalizado'
  AND fn_can_archive_campaign(id);
