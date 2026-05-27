-- ============================================================
-- MIGRAÇÃO 005 — Revogar acesso ao inativar cliente
--
-- Problema: has_client_access() não verificava clients.status,
-- então usuários de clientes inativos ainda conseguiam acessar
-- dados no portal.
--
-- Fix: adicionar JOIN em clients + verificação de status = 'ativo'
-- na função has_client_access(). Todos os RLS que dependem desta
-- função passam a bloquear automaticamente clientes inativos.
-- ============================================================

-- ── Atualizar has_client_access ──────────────────────────────
-- Antes: verificava apenas client_users (existência do vínculo)
-- Depois: verifica vínculo + cliente deve estar ativo
CREATE OR REPLACE FUNCTION has_client_access(p_client_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM   client_users  cu
    JOIN   user_profiles up ON up.id   = cu.user_id
    JOIN   clients        c  ON c.id   = cu.client_id
    WHERE  up.auth_user_id = auth.uid()
    AND    cu.client_id    = p_client_id
    AND    c.status        = 'ativo'     -- ← somente enquanto ativo
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ── Comentário atualizado ────────────────────────────────────
COMMENT ON FUNCTION has_client_access IS
  'Retorna TRUE se o usuário autenticado tem vínculo em client_users '
  'com o cliente informado E o cliente está com status = ''ativo''. '
  'Usada por todas as policies RLS de cliente.';

-- ── Nota: nenhuma migração de dados necessária ───────────────
-- Os registros em client_users são mantidos intactos.
-- Quando o cliente é reativado via reactivate_client(), o acesso
-- é restaurado automaticamente sem precisar recriar os vínculos.
