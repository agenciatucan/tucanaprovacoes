-- ============================================================
-- MIGRAÇÃO 023 — Arquiva o cronograma automaticamente quando
-- todos os posts chegam a 'finalizado' (publicados).
--
-- Mesmo padrão da migração 020 (auto-aprovação): o trigger
-- reage a mudanças em content_items.general_status e usa uma
-- função auxiliar STABLE para decidir se o cronograma como um
-- todo já cumpriu a condição.
-- ============================================================

-- ── FUNÇÃO: todos os posts do cronograma estão finalizados? ───
-- Itens com is_locked = TRUE são ignorados (mesmo critério usado
-- em fn_can_approve_campaign para posts travados individualmente).
CREATE OR REPLACE FUNCTION fn_can_archive_campaign(p_campaign_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM content_items
    WHERE campaign_id = p_campaign_id
  )
  AND NOT EXISTS (
    SELECT 1 FROM content_items
    WHERE campaign_id = p_campaign_id
    AND general_status <> 'finalizado'
    AND is_locked = FALSE
  );
$$ LANGUAGE sql STABLE;

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

CREATE TRIGGER trg_auto_archive_campaign
  AFTER UPDATE ON content_items
  FOR EACH ROW EXECUTE FUNCTION fn_auto_archive_campaign();

-- ── Backfill: cronogramas que já estão 100% finalizados hoje ──
-- Não sobrescreve campanhas já 'finalizado' — mesma convenção usada
-- na cascata de inativação de cliente (003_inactivation_cascade.sql),
-- que trata 'finalizado' como estado terminal protegido.
UPDATE campaigns c
SET status = 'arquivado'
WHERE c.status NOT IN ('arquivado', 'finalizado')
  AND fn_can_archive_campaign(c.id);
