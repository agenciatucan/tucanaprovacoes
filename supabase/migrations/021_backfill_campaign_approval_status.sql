-- ============================================================
-- MIGRAÇÃO 021 — Backfill: corrige cronogramas antigos que já
-- tinham todos os posts aprovados antes do trigger da migração
-- 020 existir, e por isso ficaram presos em "aguardando
-- aprovação" / "em revisão".
--
-- O trigger trg_auto_approve_campaign só reage a updates
-- futuros em content_items — não corrige o histórico já
-- gravado, então este passo único é necessário uma vez.
-- ============================================================

UPDATE campaigns c
SET status = 'aprovado', is_locked = TRUE
WHERE c.status IN ('enviado_para_aprovacao', 'em_revisao')
  AND fn_can_approve_campaign(c.id);
