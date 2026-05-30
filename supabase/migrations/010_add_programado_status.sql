-- ============================================================
-- MIGRATION 010 — Adiciona status 'programado' ao enum post_status.
-- Representa posts aprovados pelo cliente e agendados na
-- ferramenta de publicação (Buffer, Later, etc.).
-- ============================================================

-- ── 1. Adicionar valor ao enum ────────────────────────────────
-- ADD VALUE é irreversível em Postgres, mas é seguro e não precisa
-- de lock exclusivo na tabela.
ALTER TYPE post_status ADD VALUE IF NOT EXISTS 'programado' AFTER 'aprovado';

-- ── 2. Atualizar trigger para preservar o status 'programado' ─
-- Sem essa mudança, o trigger sobrescreveria 'programado' de volta
-- para 'aprovado' sempre que os campos de aprovação forem atualizados.
CREATE OR REPLACE FUNCTION fn_auto_update_post_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Post vai para 'aprovado' automaticamente quando todos os campos
  -- de aprovação estão aprovados. Não sobrescreve em_producao,
  -- finalizado nem programado (já passaram dessa etapa).
  IF  NEW.theme_status   = 'aprovado'
  AND NEW.caption_status = 'aprovado'
  AND NEW.artwork_status IN ('aprovado', 'nao_se_aplica')
  AND NEW.general_status NOT IN ('em_producao', 'finalizado', 'programado')
  THEN
    NEW.general_status = 'aprovado';
  END IF;

  -- Se qualquer ajuste for solicitado, o post volta para em_revisao,
  -- inclusive se já estava programado (o ajuste deve ser refeito antes
  -- de reagendar).
  IF  NEW.theme_status   = 'ajuste_solicitado'
   OR NEW.caption_status = 'ajuste_solicitado'
   OR NEW.artwork_status = 'ajuste_solicitado'
  THEN
    NEW.general_status = 'em_revisao';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
