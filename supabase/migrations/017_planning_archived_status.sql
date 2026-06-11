-- ============================================================
-- MIGRAÇÃO 017 — Suporte a arquivamento de planejamentos
-- ============================================================

ALTER TABLE planning_schedules
  DROP CONSTRAINT IF EXISTS planning_schedules_status_check;

ALTER TABLE planning_schedules
  ADD CONSTRAINT planning_schedules_status_check
    CHECK (status IN ('rascunho', 'enviado_para_aprovacao', 'em_revisao', 'aprovado', 'arquivado'));
