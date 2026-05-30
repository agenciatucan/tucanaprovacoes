-- ============================================================
-- MIGRATION 009 — Atualiza status das atividades para o novo
-- fluxo da agência (7 etapas) e padroniza slugs de categoria.
-- ============================================================

-- ── 1. Migrar dados existentes antes de adicionar constraints ─

-- Status antigos → novos
UPDATE public.activities SET
  status        = 'entrada',
  kanban_column = 'entrada'
WHERE status = 'pendente';

UPDATE public.activities SET
  status        = 'em_producao',
  kanban_column = 'em_producao'
WHERE status = 'em_andamento';

UPDATE public.activities SET
  status        = 'ajustes',
  kanban_column = 'ajustes'
WHERE status = 'em_revisao';

UPDATE public.activities SET
  status        = 'concluido',
  kanban_column = 'concluido'
WHERE status = 'concluida';

-- Categorias antigas (strings com acento) → slugs
UPDATE public.activities SET category = 'criacao'        WHERE category = 'Criação';
UPDATE public.activities SET category = 'video'          WHERE category = 'Vídeo';
UPDATE public.activities SET category = 'social_media'   WHERE category = 'Social Media';
UPDATE public.activities SET category = 'trafego_pago'   WHERE category = 'Tráfego Pago';
UPDATE public.activities SET category = 'atendimento'    WHERE category = 'Atendimento';
UPDATE public.activities SET category = 'gravacao'       WHERE category = 'Gravação';
UPDATE public.activities SET category = 'relatorio'      WHERE category = 'Relatório';
UPDATE public.activities SET category = 'administrativo' WHERE category = 'Administrativo';
UPDATE public.activities SET category = 'ajustes_cat'    WHERE category = 'Ajustes';
UPDATE public.activities SET category = 'estrategia'     WHERE category = 'Estratégia';
-- renomear o temporário (evitar conflito com status 'ajustes')
UPDATE public.activities SET category = 'ajustes' WHERE category = 'ajustes_cat';

-- ── 2. Atualizar defaults ─────────────────────────────────────
ALTER TABLE public.activities
  ALTER COLUMN status        SET DEFAULT 'entrada',
  ALTER COLUMN kanban_column SET DEFAULT 'entrada',
  ALTER COLUMN category      SET DEFAULT 'criacao';

-- ── 3. Adicionar CHECK constraints ───────────────────────────
ALTER TABLE public.activities
  ADD CONSTRAINT activities_status_check
  CHECK (status IN (
    'entrada', 'em_analise', 'atribuido', 'em_producao',
    'em_aprovacao', 'ajustes', 'concluido', 'arquivada'
  ));

ALTER TABLE public.activities
  ADD CONSTRAINT activities_kanban_column_check
  CHECK (kanban_column IN (
    'entrada', 'em_analise', 'atribuido', 'em_producao',
    'em_aprovacao', 'ajustes', 'concluido'
  ));

ALTER TABLE public.activities
  ADD CONSTRAINT activities_category_check
  CHECK (category IN (
    'criacao', 'video', 'social_media', 'trafego_pago', 'atendimento',
    'gravacao', 'relatorio', 'administrativo', 'ajustes', 'estrategia'
  ));

ALTER TABLE public.activities
  ADD CONSTRAINT activities_priority_check
  CHECK (priority IN ('baixa', 'media', 'alta', 'urgente'));

ALTER TABLE public.activities
  ADD CONSTRAINT activities_visibility_check
  CHECK (visibility IN ('interna', 'cliente'));
