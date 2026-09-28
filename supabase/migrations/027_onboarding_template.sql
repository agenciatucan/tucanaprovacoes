-- ============================================================
-- MIGRAÇÃO 027 — Checklist de onboarding editável
-- • onboarding_sections / onboarding_items passam a ser o catálogo
--   do checklist, editável por admins em /admin/configuracoes/onboarding
--   (antes era fixo em src/lib/constants/onboarding.ts)
-- • client_onboarding_items passa a referenciar onboarding_items(id)
--   em vez de guardar section/item_key como texto solto — remover um
--   item do catálogo agora remove (em cascata) o estado dele de todo
--   cliente que o tinha.
-- ============================================================

-- ── Catálogo: seções ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.onboarding_sections (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  key         TEXT        NOT NULL UNIQUE,
  title       TEXT        NOT NULL,
  description TEXT,
  order_index INTEGER     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_onboarding_sections_updated_at
  BEFORE UPDATE ON public.onboarding_sections
  FOR EACH ROW EXECUTE FUNCTION public.fn_update_updated_at();

-- ── Catálogo: itens ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.onboarding_items (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id  UUID        NOT NULL REFERENCES public.onboarding_sections(id) ON DELETE CASCADE,
  key         TEXT        NOT NULL UNIQUE,
  label       TEXT        NOT NULL,
  order_index INTEGER     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_onboarding_items_updated_at
  BEFORE UPDATE ON public.onboarding_items
  FOR EACH ROW EXECUTE FUNCTION public.fn_update_updated_at();

CREATE INDEX IF NOT EXISTS idx_onboarding_items_section_id
  ON public.onboarding_items(section_id);

-- ── RLS — leitura: admin + equipe · escrita: apenas admin ──────
-- (checklist é operado por toda a equipe, mas só admin edita o catálogo,
-- igual à regra de acesso de /admin/configuracoes)
ALTER TABLE public.onboarding_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_items    ENABLE ROW LEVEL SECURITY;

CREATE POLICY "onboarding_sections_admin_write"
  ON public.onboarding_sections FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_profiles WHERE auth_user_id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_profiles WHERE auth_user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "onboarding_sections_staff_read"
  ON public.onboarding_sections FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_profiles WHERE auth_user_id = auth.uid() AND role IN ('admin', 'equipe')));

CREATE POLICY "onboarding_items_admin_write"
  ON public.onboarding_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_profiles WHERE auth_user_id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_profiles WHERE auth_user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "onboarding_items_staff_read"
  ON public.onboarding_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_profiles WHERE auth_user_id = auth.uid() AND role IN ('admin', 'equipe')));

-- ── Seed — catálogo atual (7 seções · 43 itens) ────────────────
INSERT INTO public.onboarding_sections (key, title, description, order_index) VALUES
  ('comercial_juridico', '1. Comercial e jurídico', 'Nada de produção começa antes de contrato assinado e primeira cobrança combinada.', 0),
  ('briefing_diagnostico', '2. Briefing e diagnóstico', 'O objetivo desta etapa é sair da reunião sabendo quem o profissional quer atrair e o que ele não aceita mostrar.', 1),
  ('conformidade_cfm', '3. Conformidade CFM', 'Toda peça de saúde precisa respeitar as regras do CFM, e o profissional responde pela validação técnica do conteúdo.', 2),
  ('acessos_ativos', '4. Acessos e ativos', 'Peça acesso por parceria ou papel de administrador, nunca a senha pessoal do cliente.', 3),
  ('estrategia_planejamento', '5. Estratégia e planejamento', 'Com briefing e acessos prontos, a estratégia e o calendário do primeiro mês devem sair em até uma semana.', 4),
  ('operacao_comunicacao', '6. Operação e comunicação', 'Deixe combinado desde o início como e quando o cliente aprova, para o calendário não atrasar.', 5),
  ('kickoff_acompanhamento', '7. Kickoff e acompanhamento', 'Uma primeira entrega rápida gera confiança, e a revisão após 30 a 60 dias ajusta a estratégia com dados reais.', 6)
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.onboarding_items (section_id, key, label, order_index)
SELECT s.id, v.item_key, v.label, v.order_index
FROM (VALUES
  ('comercial_juridico', 'contrato_assinado', 'Contrato assinado (escopo, entregas mensais, vigência, valor, forma de pagamento, reajuste, cancelamento)', 0),
  ('comercial_juridico', 'clausula_uso_imagem', 'Cláusula de uso de imagem e direitos sobre o conteúdo', 1),
  ('comercial_juridico', 'clausula_responsabilidade_validacao', 'Cláusula de responsabilidade do profissional pela validação técnica das informações', 2),
  ('comercial_juridico', 'termo_sigilo_lgpd', 'Termo de sigilo e LGPD (especialmente se houver dados ou imagens de pacientes)', 3),
  ('comercial_juridico', 'primeira_cobranca', 'Primeira cobrança emitida ou pagamento confirmado', 4),
  ('comercial_juridico', 'contrato_arquivado', 'Contrato e comprovantes arquivados na pasta do cliente', 5),
  ('briefing_diagnostico', 'reuniao_alinhamento', 'Reunião de alinhamento realizada (trajetória, especialidade, diferenciais, procedimentos a destacar)', 0),
  ('briefing_diagnostico', 'publico_metas', 'Público ideal e metas definidos (agendamentos, autoridade, cirurgias específicas)', 1),
  ('briefing_diagnostico', 'analise_instagram', 'Análise do Instagram atual (bio, destaques, grade, frequência, engajamento)', 2),
  ('briefing_diagnostico', 'analise_gmn_site', 'Análise do Google Meu Negócio e do site', 3),
  ('briefing_diagnostico', 'analise_concorrentes', 'Análise de 3 concorrentes ou referências da especialidade', 4),
  ('briefing_diagnostico', 'identidade_visual', 'Identidade visual levantada (logo, cores, fontes) ou necessidade de criação registrada', 5),
  ('briefing_diagnostico', 'tom_de_voz', 'Tom de voz definido', 6),
  ('briefing_diagnostico', 'temas_vetados', 'Assuntos e formatos que o profissional não quer registrados por escrito', 7),
  ('conformidade_cfm', 'regras_cfm_alinhadas', 'Regras alinhadas com o profissional: sem promessa de resultado, sem "antes e depois", sem sensacionalismo, sem preço ou promoção', 0),
  ('conformidade_cfm', 'crm_rqe_definidos', 'CRM (e RQE, se aplicável) definidos para constar nas peças', 1),
  ('conformidade_cfm', 'regra_imagens_pacientes', 'Regra sobre imagens de pacientes combinada (autorização por escrito, quando permitido)', 2),
  ('conformidade_cfm', 'acordo_validacao_conteudo', 'Acordo registrado por escrito de que o profissional valida o conteúdo antes da publicação', 3),
  ('conformidade_cfm', 'termos_sensiveis_anotados', 'Lista de termos e temas sensíveis da especialidade anotada', 4),
  ('acessos_ativos', 'acesso_instagram', 'Acesso ao Instagram via Meta Business Suite / Gerenciador de Negócios', 0),
  ('acessos_ativos', 'acesso_gmn', 'Acesso ao Google Meu Negócio', 1),
  ('acessos_ativos', 'acesso_site_analytics', 'Acesso ao site, Google Analytics e pixel (se houver)', 2),
  ('acessos_ativos', 'pasta_compartilhada', 'Pasta compartilhada criada (logo em alta, fotos profissionais, vídeos, materiais anteriores)', 3),
  ('acessos_ativos', 'kit_marca_canva', 'Kit de marca do cliente configurado no Canva', 4),
  ('acessos_ativos', 'documentos_apoio_recebidos', 'Documentos e informações técnicas de apoio recebidos (artigos, protocolos, fotos da clínica)', 5),
  ('estrategia_planejamento', 'pilares_conteudo', 'Pilares de conteúdo definidos (educativo, autoridade, bastidores, prova social dentro das regras)', 0),
  ('estrategia_planejamento', 'linha_editorial_frequencia', 'Linha editorial e frequência combinadas (posts, stories, reels)', 1),
  ('estrategia_planejamento', 'calendario_primeiro_mes', 'Calendário do primeiro mês montado, com datas relevantes da especialidade', 2),
  ('estrategia_planejamento', 'dia_captacao_agendado', 'Dia de captação agendado (fotos e vídeos com o profissional)', 3),
  ('estrategia_planejamento', 'roteiro_captacao', 'Roteiro ou lista de pautas para a captação preparado', 4),
  ('estrategia_planejamento', 'estrategia_aprovada', 'Estratégia apresentada e aprovada pelo cliente', 5),
  ('operacao_comunicacao', 'canal_oficial_definido', 'Canal oficial definido (grupo de WhatsApp) e horário de atendimento informado', 0),
  ('operacao_comunicacao', 'prazo_aprovacao_combinado', 'Prazo de aprovação combinado, com número de rodadas de ajuste e o que acontece se o cliente não responder', 1),
  ('operacao_comunicacao', 'cliente_portal_aprovacao', 'Cliente cadastrado no portal de aprovação de posts', 2),
  ('operacao_comunicacao', 'cliente_portal_financeiro', 'Cliente cadastrado no portal financeiro', 3),
  ('operacao_comunicacao', 'pasta_interna_criada', 'Pasta do cliente criada na estrutura interna da agência', 4),
  ('operacao_comunicacao', 'cliente_rotina_producao', 'Cliente incluído na rotina de produção (quadro de tarefas e calendário)', 5),
  ('kickoff_acompanhamento', 'primeiras_pecas_enviadas', 'Primeiras peças (ou calendário completo) enviadas para aprovação em até 7 dias após o briefing', 0),
  ('kickoff_acompanhamento', 'primeira_publicacao_no_ar', 'Primeira publicação no ar', 1),
  ('kickoff_acompanhamento', 'metricas_iniciais_registradas', 'Métricas iniciais registradas (seguidores, alcance, engajamento) como ponto de partida', 2),
  ('kickoff_acompanhamento', 'relatorio_mensal_enviado', 'Relatório mensal enviado (alcance, engajamento, seguidores, agendamentos atribuídos, aprendizados)', 3),
  ('kickoff_acompanhamento', 'reuniao_revisao_marcada', 'Reunião de revisão marcada para 30 a 60 dias após o início', 4),
  ('kickoff_acompanhamento', 'ajustes_pos_revisao', 'Ajustes de estratégia registrados após a revisão', 5)
) AS v(section_key, item_key, label, order_index)
JOIN public.onboarding_sections s ON s.key = v.section_key
ON CONFLICT (key) DO NOTHING;

-- ── Migra client_onboarding_items de (section, item_key) texto ─
-- para uma referência real a onboarding_items(id).
ALTER TABLE public.client_onboarding_items
  ADD COLUMN IF NOT EXISTS item_id UUID REFERENCES public.onboarding_items(id) ON DELETE CASCADE;

UPDATE public.client_onboarding_items coi
SET item_id = oi.id
FROM public.onboarding_items oi
WHERE oi.key = coi.item_key
  AND coi.item_id IS NULL;

-- Qualquer linha que não tenha casado (não deveria acontecer, catálogo é o mesmo) é descartada.
DELETE FROM public.client_onboarding_items WHERE item_id IS NULL;

ALTER TABLE public.client_onboarding_items
  ALTER COLUMN item_id SET NOT NULL;

ALTER TABLE public.client_onboarding_items DROP COLUMN IF EXISTS section;
ALTER TABLE public.client_onboarding_items DROP COLUMN IF EXISTS item_key CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_client_onboarding_items_client_item
  ON public.client_onboarding_items(client_id, item_id);

CREATE INDEX IF NOT EXISTS idx_client_onboarding_items_item_id
  ON public.client_onboarding_items(item_id);
