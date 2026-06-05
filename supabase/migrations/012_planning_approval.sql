-- ============================================================
-- MIGRAÇÃO 012 — Aprovação de planejamento mensal de temas
-- Permite que clientes aprovem os temas antes da produção
-- ============================================================

-- ── Flag por cliente ───────────────────────────────────────────
-- Quando true, exige aprovação de planejamento antes da produção
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS requires_planning_approval BOOLEAN NOT NULL DEFAULT false;

-- ── Enum: status do planejamento ──────────────────────────────
ALTER TYPE approval_type ADD VALUE IF NOT EXISTS 'planejamento';

-- ── Tabela: cronograma de planejamento ────────────────────────
CREATE TABLE IF NOT EXISTS planning_schedules (
  id                UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id         UUID        NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  title             TEXT        NOT NULL,
  month_year        TEXT        NOT NULL,  -- ex: "2025-06"
  status            TEXT        NOT NULL DEFAULT 'rascunho'
                                CHECK (status IN ('rascunho', 'enviado_para_aprovacao', 'em_revisao', 'aprovado')),
  approval_token    TEXT        NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  token_expires_at  TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '60 days'),
  notes             TEXT,
  created_by        UUID        NOT NULL REFERENCES user_profiles(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Tabela: itens do planejamento ─────────────────────────────
CREATE TABLE IF NOT EXISTS planning_items (
  id                      UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  planning_schedule_id    UUID        NOT NULL REFERENCES planning_schedules(id) ON DELETE CASCADE,
  client_id               UUID        NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  week_label              TEXT        NOT NULL,  -- ex: "Semana 1"
  title                   TEXT        NOT NULL,  -- título/tema do post
  content_type            TEXT        NOT NULL DEFAULT 'arte'
                                      CHECK (content_type IN ('arte', 'reels', 'carrossel', 'story', 'outro')),
  order_index             INTEGER     NOT NULL DEFAULT 0,
  notes                   TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Trigger: updated_at automático ────────────────────────────
CREATE TRIGGER trg_planning_schedules_updated_at
  BEFORE UPDATE ON planning_schedules
  FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at();

-- ── Índices ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_planning_schedules_client_id
  ON planning_schedules(client_id);

CREATE INDEX IF NOT EXISTS idx_planning_schedules_token
  ON planning_schedules(approval_token);

CREATE INDEX IF NOT EXISTS idx_planning_items_schedule_id
  ON planning_items(planning_schedule_id);

-- ── RLS ───────────────────────────────────────────────────────
ALTER TABLE planning_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE planning_items     ENABLE ROW LEVEL SECURITY;

-- Staff pode ver e gerenciar tudo
CREATE POLICY "staff_all_planning_schedules"
  ON planning_schedules FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE auth_user_id = auth.uid()
        AND role IN ('admin', 'equipe')
    )
  );

CREATE POLICY "staff_all_planning_items"
  ON planning_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE auth_user_id = auth.uid()
        AND role IN ('admin', 'equipe')
    )
  );

-- Clientes veem apenas seus planejamentos
CREATE POLICY "client_read_own_planning_schedules"
  ON planning_schedules FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM client_users cu
      JOIN user_profiles up ON up.id = cu.user_id
      WHERE up.auth_user_id = auth.uid()
        AND cu.client_id = planning_schedules.client_id
    )
  );

CREATE POLICY "client_read_own_planning_items"
  ON planning_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM client_users cu
      JOIN user_profiles up ON up.id = cu.user_id
      WHERE up.auth_user_id = auth.uid()
        AND cu.client_id = planning_items.client_id
    )
  );
