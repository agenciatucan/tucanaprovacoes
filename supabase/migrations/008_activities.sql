-- ============================================================
-- MIGRATION 008 — Atividades internas da agência
-- Tabela para tarefas internas que também aparecem no Kanban.
-- Separada de content_items (posts de cronograma).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.activities (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT         NOT NULL,
  description     TEXT,
  client_id       UUID         REFERENCES public.clients(id)        ON DELETE SET NULL,
  responsible_id  UUID         REFERENCES public.user_profiles(id)  ON DELETE SET NULL,
  category        TEXT         NOT NULL DEFAULT 'Criação',
  priority        TEXT         NOT NULL DEFAULT 'media',
  -- status: pendente | em_andamento | em_revisao | concluida | arquivada
  status          TEXT         NOT NULL DEFAULT 'pendente',
  -- kanban_column: mapeado do status (pendente, em_revisao, em_producao, finalizado)
  kanban_column   TEXT         NOT NULL DEFAULT 'pendente',
  due_date        DATE,
  visibility      TEXT         NOT NULL DEFAULT 'interna',
  created_by      UUID         REFERENCES public.user_profiles(id)  ON DELETE SET NULL,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  archived_at     TIMESTAMPTZ
);

-- Trigger para manter updated_at sincronizado
CREATE OR REPLACE FUNCTION public.update_activities_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_activities_updated_at
  BEFORE UPDATE ON public.activities
  FOR EACH ROW
  EXECUTE FUNCTION public.update_activities_updated_at();

-- Índices para queries frequentes
CREATE INDEX IF NOT EXISTS idx_activities_status          ON public.activities(status);
CREATE INDEX IF NOT EXISTS idx_activities_kanban_column   ON public.activities(kanban_column);
CREATE INDEX IF NOT EXISTS idx_activities_client_id       ON public.activities(client_id);
CREATE INDEX IF NOT EXISTS idx_activities_responsible_id  ON public.activities(responsible_id);
CREATE INDEX IF NOT EXISTS idx_activities_created_by      ON public.activities(created_by);
CREATE INDEX IF NOT EXISTS idx_activities_archived_at     ON public.activities(archived_at);

-- ── Row Level Security ────────────────────────────────────────
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

-- Admin e equipe têm acesso total
CREATE POLICY "activities_staff_all"
  ON public.activities
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE auth_user_id = auth.uid()
        AND role IN ('admin', 'equipe')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE auth_user_id = auth.uid()
        AND role IN ('admin', 'equipe')
    )
  );

-- Clientes não têm acesso (não há política para role 'cliente')
-- A ausência de política para 'cliente' + RLS habilitada = acesso negado automaticamente
