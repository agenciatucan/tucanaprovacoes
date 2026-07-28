-- ============================================================
-- MIGRAÇÃO 019 — Tarefas pessoais (calendário individual por login)
-- Cada usuário (admin/equipe) vê e gerencia apenas suas próprias tarefas.
-- ============================================================

CREATE TABLE IF NOT EXISTS personal_tasks (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id    UUID        NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  title       TEXT        NOT NULL,
  description TEXT,
  task_date   DATE        NOT NULL,
  start_time  TIME,
  end_time    TIME,
  done        BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_personal_tasks_updated_at
  BEFORE UPDATE ON personal_tasks
  FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at();

CREATE INDEX IF NOT EXISTS idx_personal_tasks_owner_date
  ON personal_tasks(owner_id, task_date);

-- ── RLS — cada usuário só acessa as próprias tarefas ─────────
ALTER TABLE personal_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_all_personal_tasks"
  ON personal_tasks FOR ALL
  USING (
    owner_id IN (SELECT id FROM user_profiles WHERE auth_user_id = auth.uid())
  )
  WITH CHECK (
    owner_id IN (SELECT id FROM user_profiles WHERE auth_user_id = auth.uid())
  );
