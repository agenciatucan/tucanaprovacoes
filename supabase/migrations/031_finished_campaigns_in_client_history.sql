-- ============================================================
-- MIGRAÇÃO 031 — Cronograma concluído vai para o Histórico do cliente
--
-- Decisão do responsável em 2026-10-15 (docs/auditoria-projeto, AUD-003):
-- cronograma com todos os posts publicados sai das telas principais do
-- cliente, mas continua acessível no "Histórico".
--
-- Por que 'finalizado' e não 'arquivado': 'arquivado' é bloqueado para o
-- cliente pelo RLS (028) e pelas páginas, então ele não conseguiria abrir o
-- cronograma pelo Histórico. A tela inicial e "Aprovados" do cliente passam a
-- listar só cronogramas em andamento (código no mesmo commit); o Histórico
-- lista os 'finalizado'. 'arquivado' continua oculto em tudo (manual ou
-- inativação de cliente).
--
-- Substitui a migração 030 (mesmo conteúdo das partes 1 e 4 da 029).
--
-- 1. fn_auto_archive_campaign marca 'finalizado'.
-- 2. Dados: cronogramas 'arquivado' com todos os posts finalizados, sem
--    inativação e de cliente ativo, viram 'finalizado'. Hoje são os 2
--    cronogramas concluídos.
--
-- Conferência (rode antes):
--   SELECT c.id, c.name, c.status
--   FROM campaigns c JOIN clients cl ON cl.id = c.client_id
--   WHERE c.status = 'arquivado' AND c.inactivated_at IS NULL
--     AND cl.status = 'ativo' AND fn_can_archive_campaign(c.id);
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
    SET status = 'finalizado'
    WHERE id = NEW.campaign_id
      AND status NOT IN ('arquivado', 'finalizado');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

UPDATE campaigns c
SET status = 'finalizado'
FROM clients cl
WHERE cl.id = c.client_id
  AND c.status = 'arquivado'
  AND c.inactivated_at IS NULL
  AND cl.status = 'ativo'
  AND fn_can_archive_campaign(c.id);
