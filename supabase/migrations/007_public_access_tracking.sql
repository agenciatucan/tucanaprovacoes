-- ============================================================
-- MIGRAÇÃO 007 — Rastreamento opcional do acesso público
-- Permite saber quem acessou/aprovou pelo link público.
-- ============================================================

CREATE TABLE IF NOT EXISTS public_access_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  visitor_name TEXT NOT NULL,
  visitor_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public_approval_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  content_item_id UUID REFERENCES content_items(id) ON DELETE CASCADE,
  visitor_name TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('approval', 'adjustment')),
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public_access_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public_approval_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "staff_read_public_access_sessions"
ON public_access_sessions
FOR SELECT
USING (is_staff());

CREATE POLICY IF NOT EXISTS "staff_read_public_approval_events"
ON public_approval_events
FOR SELECT
USING (is_staff());

CREATE POLICY IF NOT EXISTS "service_insert_public_access_sessions"
ON public_access_sessions
FOR INSERT
WITH CHECK (TRUE);

CREATE POLICY IF NOT EXISTS "service_insert_public_approval_events"
ON public_approval_events
FOR INSERT
WITH CHECK (TRUE);
