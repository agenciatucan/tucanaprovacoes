-- ============================================================
-- MIGRAÇÃO 032 — Posts ainda sem legenda/arquivo voltam para "Em produção"
--
-- Regra definida pelo responsável em 2026-10-15:
--   - posts criados pela aprovação do planejamento entram em 'em_producao';
--   - saem para 'pendente' (aguardando aprovação) quando tiverem legenda e
--     pelo menos um arquivo visível ao cliente (src/lib/posts/production.ts).
--
-- Esta migração aplica a regra aos posts que já existem: posts 'pendente'
-- sem legenda OU sem arquivo visível, em cronogramas em andamento, passam a
-- 'em_producao'. Conferido em 2026-10-15 (somente leitura): 10 posts.
--
-- Conferência (rode antes):
--   SELECT ci.id, ci.title, c.name AS cronograma
--   FROM content_items ci JOIN campaigns c ON c.id = ci.campaign_id
--   WHERE ci.general_status = 'pendente'
--     AND c.status NOT IN ('rascunho', 'arquivado', 'finalizado')
--     AND (COALESCE(btrim(ci.caption), '') = ''
--          OR NOT EXISTS (SELECT 1 FROM files f
--                         WHERE f.content_item_id = ci.id AND f.visible_to_client));
--
-- Não apaga dados.
-- ============================================================

UPDATE content_items ci
SET general_status = 'em_producao'
FROM campaigns c
WHERE c.id = ci.campaign_id
  AND ci.general_status = 'pendente'
  AND c.status NOT IN ('rascunho', 'arquivado', 'finalizado')
  AND (
    COALESCE(btrim(ci.caption), '') = ''
    OR NOT EXISTS (
      SELECT 1 FROM files f
      WHERE f.content_item_id = ci.id AND f.visible_to_client
    )
  );
