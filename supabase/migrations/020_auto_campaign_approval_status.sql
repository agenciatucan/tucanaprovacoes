-- ============================================================
-- MIGRAÇÃO 020 — Corrige status do cronograma travado em
-- "aguardando aprovação" mesmo com todos os posts aprovados
--
-- Causa raiz: fn_can_approve_campaign() e approveCampaign() já
-- existiam, mas nenhuma ação da aplicação (aprovação individual,
-- "aprovar todos" ou link público) chamava approveCampaign() —
-- então campaigns.status nunca era promovido para 'aprovado'.
--
-- Corrige na camada de banco (trigger), cobrindo todos os
-- pontos de entrada de uma vez.
-- ============================================================

CREATE OR REPLACE FUNCTION fn_auto_approve_campaign()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.general_status IS DISTINCT FROM OLD.general_status
     AND fn_can_approve_campaign(NEW.campaign_id)
  THEN
    UPDATE campaigns
    SET status = 'aprovado', is_locked = TRUE
    WHERE id = NEW.campaign_id
      AND status IN ('enviado_para_aprovacao', 'em_revisao');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_auto_approve_campaign
  AFTER UPDATE ON content_items
  FOR EACH ROW EXECUTE FUNCTION fn_auto_approve_campaign();
