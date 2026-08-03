-- ============================================================
-- MIGRAÇÃO 024 — Período do dia nas tarefas pessoais
-- Permite organizar "Minhas Tarefas" em quadros de Manhã/Tarde/Noite.
-- ============================================================

ALTER TABLE personal_tasks
  ADD COLUMN IF NOT EXISTS period TEXT NOT NULL DEFAULT 'manha'
    CHECK (period IN ('manha', 'tarde', 'noite'));
