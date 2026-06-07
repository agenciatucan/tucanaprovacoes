-- ============================================================
-- MIGRAÇÃO 016 — Eventos internos da agência + sync com Google Agenda
-- Permite cadastrar reuniões/datas internas e sincronizá-las
-- de forma bidirecional com uma agenda compartilhada do Google
-- ============================================================

-- ── Tabela: conexão com o Google Calendar (única, da agência) ─
CREATE TABLE IF NOT EXISTS google_calendar_connections (
  id                    UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  google_account_email  TEXT        NOT NULL,
  calendar_id           TEXT        NOT NULL DEFAULT 'primary',
  access_token_enc      TEXT        NOT NULL,
  refresh_token_enc     TEXT        NOT NULL,
  token_expires_at      TIMESTAMPTZ NOT NULL,
  sync_token            TEXT,
  last_synced_at        TIMESTAMPTZ,
  connected_by          UUID        REFERENCES user_profiles(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Tabela: eventos internos (reuniões/datas da agência) ──────
CREATE TABLE IF NOT EXISTS internal_events (
  id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  title               TEXT        NOT NULL,
  description         TEXT,
  location            TEXT,
  event_date          DATE        NOT NULL,
  start_time          TIME,
  end_time            TIME,
  google_event_id     TEXT        UNIQUE,
  google_updated_at   TIMESTAMPTZ,
  created_by          UUID        REFERENCES user_profiles(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Trigger: updated_at automático ────────────────────────────
CREATE TRIGGER trg_google_calendar_connections_updated_at
  BEFORE UPDATE ON google_calendar_connections
  FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at();

CREATE TRIGGER trg_internal_events_updated_at
  BEFORE UPDATE ON internal_events
  FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at();

-- ── Índices ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_internal_events_date
  ON internal_events(event_date);

CREATE INDEX IF NOT EXISTS idx_internal_events_google_id
  ON internal_events(google_event_id);

-- ── RLS ───────────────────────────────────────────────────────
ALTER TABLE google_calendar_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE internal_events             ENABLE ROW LEVEL SECURITY;

-- Apenas staff (admin/equipe) acessa a conexão e os eventos internos
CREATE POLICY "staff_all_google_calendar_connections"
  ON google_calendar_connections FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE auth_user_id = auth.uid()
        AND role IN ('admin', 'equipe')
    )
  );

CREATE POLICY "staff_all_internal_events"
  ON internal_events FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE auth_user_id = auth.uid()
        AND role IN ('admin', 'equipe')
    )
  );
