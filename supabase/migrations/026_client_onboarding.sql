-- ============================================================
-- MIGRAÇÃO 026 — Onboarding de novo cliente
-- • Novos campos na ficha do cliente (especialidade, plano, vigência, perfis)
-- • Tabela client_onboarding_items — checklist das 7 etapas do onboarding
-- • Backfill: clientes já ativos entram com o checklist concluído
-- ============================================================

-- ── Ficha do cliente — campos adicionais ──────────────────────
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS specialty              TEXT,
  ADD COLUMN IF NOT EXISTS professional_register  TEXT,
  ADD COLUMN IF NOT EXISTS plan_name              TEXT,
  ADD COLUMN IF NOT EXISTS monthly_value          NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS contract_start_date    DATE,
  ADD COLUMN IF NOT EXISTS contract_end_date      DATE,
  ADD COLUMN IF NOT EXISTS main_objective         TEXT,
  ADD COLUMN IF NOT EXISTS instagram_url          TEXT,
  ADD COLUMN IF NOT EXISTS website_url            TEXT,
  ADD COLUMN IF NOT EXISTS google_business_url    TEXT;

-- ── Checklist de onboarding ────────────────────────────────────
-- Um registro por (cliente, item_key). O catálogo de item_key/seção/rótulo
-- vive em src/lib/constants/onboarding.ts — aqui só guardamos o estado.
CREATE TABLE IF NOT EXISTS public.client_onboarding_items (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   UUID        NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  section     TEXT        NOT NULL,
  item_key    TEXT        NOT NULL,
  done        BOOLEAN     NOT NULL DEFAULT FALSE,
  done_at     TIMESTAMPTZ,
  done_by     UUID        REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (client_id, item_key)
);

CREATE INDEX IF NOT EXISTS idx_client_onboarding_items_client_id
  ON public.client_onboarding_items(client_id);

-- ── Row Level Security ────────────────────────────────────────
-- Checklist é uso interno da agência: apenas admin/equipe têm acesso.
-- Clientes não têm política própria (RLS habilitada = acesso negado).
ALTER TABLE public.client_onboarding_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "onboarding_items_staff_all"
  ON public.client_onboarding_items
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

-- ── Backfill — clientes já ativos entram com o checklist concluído ─
-- Evita que clientes que já estão em operação apareçam com onboarding
-- pendente só porque o checklist foi criado depois deles.
INSERT INTO public.client_onboarding_items (client_id, section, item_key, done, done_at)
SELECT c.id, v.section, v.item_key, TRUE, c.created_at
FROM public.clients c
CROSS JOIN (VALUES
  ('comercial_juridico', 'contrato_assinado'),
  ('comercial_juridico', 'clausula_uso_imagem'),
  ('comercial_juridico', 'clausula_responsabilidade_validacao'),
  ('comercial_juridico', 'termo_sigilo_lgpd'),
  ('comercial_juridico', 'primeira_cobranca'),
  ('comercial_juridico', 'contrato_arquivado'),
  ('briefing_diagnostico', 'reuniao_alinhamento'),
  ('briefing_diagnostico', 'publico_metas'),
  ('briefing_diagnostico', 'analise_instagram'),
  ('briefing_diagnostico', 'analise_gmn_site'),
  ('briefing_diagnostico', 'analise_concorrentes'),
  ('briefing_diagnostico', 'identidade_visual'),
  ('briefing_diagnostico', 'tom_de_voz'),
  ('briefing_diagnostico', 'temas_vetados'),
  ('conformidade_cfm', 'regras_cfm_alinhadas'),
  ('conformidade_cfm', 'crm_rqe_definidos'),
  ('conformidade_cfm', 'regra_imagens_pacientes'),
  ('conformidade_cfm', 'acordo_validacao_conteudo'),
  ('conformidade_cfm', 'termos_sensiveis_anotados'),
  ('acessos_ativos', 'acesso_instagram'),
  ('acessos_ativos', 'acesso_gmn'),
  ('acessos_ativos', 'acesso_site_analytics'),
  ('acessos_ativos', 'pasta_compartilhada'),
  ('acessos_ativos', 'kit_marca_canva'),
  ('acessos_ativos', 'documentos_apoio_recebidos'),
  ('estrategia_planejamento', 'pilares_conteudo'),
  ('estrategia_planejamento', 'linha_editorial_frequencia'),
  ('estrategia_planejamento', 'calendario_primeiro_mes'),
  ('estrategia_planejamento', 'dia_captacao_agendado'),
  ('estrategia_planejamento', 'roteiro_captacao'),
  ('estrategia_planejamento', 'estrategia_aprovada'),
  ('operacao_comunicacao', 'canal_oficial_definido'),
  ('operacao_comunicacao', 'prazo_aprovacao_combinado'),
  ('operacao_comunicacao', 'cliente_portal_aprovacao'),
  ('operacao_comunicacao', 'cliente_portal_financeiro'),
  ('operacao_comunicacao', 'pasta_interna_criada'),
  ('operacao_comunicacao', 'cliente_rotina_producao'),
  ('kickoff_acompanhamento', 'primeiras_pecas_enviadas'),
  ('kickoff_acompanhamento', 'primeira_publicacao_no_ar'),
  ('kickoff_acompanhamento', 'metricas_iniciais_registradas'),
  ('kickoff_acompanhamento', 'relatorio_mensal_enviado'),
  ('kickoff_acompanhamento', 'reuniao_revisao_marcada'),
  ('kickoff_acompanhamento', 'ajustes_pos_revisao')
) AS v(section, item_key)
ON CONFLICT (client_id, item_key) DO NOTHING;
