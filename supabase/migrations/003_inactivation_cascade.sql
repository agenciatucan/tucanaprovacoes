-- ============================================================
-- MIGRAÇÃO 003 — Soft-delete / inativação em cascata
--
-- O campo `status` em `clients` já existia ('ativo'/'inativo').
-- Esta migration adiciona:
--   • inactivated_at em clients e campaigns (rastreabilidade)
--   • índices de performance em status
--   • função RPC inactivate_client  → arquiva cliente + cronogramas
--   • função RPC reactivate_client  → reativa somente o cliente
-- ============================================================

-- ── 1. Colunas ─────────────────────────────────────────────
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS inactivated_at TIMESTAMPTZ;

ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS inactivated_at TIMESTAMPTZ;

-- ── 2. Índices de busca ─────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_clients_status   ON public.clients(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON public.campaigns(status);

-- ── 3. Função: inativar cliente em cascata ──────────────────
-- Permissão: admin ou equipe
-- Efeito:
--   • clients  → status = 'inativo', inactivated_at = now()
--   • campaigns → status = 'arquivado', inactivated_at = now()
--     (apenas as que ainda não estão finalizadas ou arquivadas)
-- Content_items ficam intactos; a UI já oculta pelo status da campaign.
-- ──────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.inactivate_client(p_client_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
BEGIN
  -- Verificar permissão (equipe ou admin)
  SELECT role INTO v_role
  FROM public.user_profiles
  WHERE auth_user_id = auth.uid();

  IF v_role IS NULL OR v_role NOT IN ('admin', 'equipe') THEN
    RAISE EXCEPTION 'Apenas a equipe Tucan pode inativar clientes.';
  END IF;

  -- Validar que o cliente existe
  IF NOT EXISTS (SELECT 1 FROM public.clients WHERE id = p_client_id) THEN
    RAISE EXCEPTION 'Cliente não encontrado.';
  END IF;

  -- Inativar o cliente
  UPDATE public.clients
  SET
    status         = 'inativo',
    inactivated_at = NOW(),
    updated_at     = NOW()
  WHERE id = p_client_id;

  -- Arquivar todos os cronogramas ativos deste cliente
  UPDATE public.campaigns
  SET
    status         = 'arquivado',
    inactivated_at = NOW(),
    updated_at     = NOW()
  WHERE client_id  = p_client_id
    AND status NOT IN ('arquivado', 'finalizado');

END;
$$;

-- ── 4. Função: reativar cliente ─────────────────────────────
-- Restaura apenas o cliente (status = 'ativo').
-- Os cronogramas arquivados NÃO são restaurados automaticamente
-- para evitar reabrir trabalhos encerrados sem revisão.
-- ──────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.reactivate_client(p_client_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
BEGIN
  SELECT role INTO v_role
  FROM public.user_profiles
  WHERE auth_user_id = auth.uid();

  IF v_role IS NULL OR v_role NOT IN ('admin', 'equipe') THEN
    RAISE EXCEPTION 'Apenas a equipe Tucan pode reativar clientes.';
  END IF;

  UPDATE public.clients
  SET
    status         = 'ativo',
    inactivated_at = NULL,
    updated_at     = NOW()
  WHERE id = p_client_id;

END;
$$;

-- ── 5. Permissões ───────────────────────────────────────────
-- As funções são SECURITY DEFINER, então rodam com permissões
-- do owner (service role). O grant abaixo permite que usuários
-- autenticados as chamem via supabase.rpc().
GRANT EXECUTE ON FUNCTION public.inactivate_client(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reactivate_client(uuid)  TO authenticated;

-- ── 6. Comentários ─────────────────────────────────────────
COMMENT ON FUNCTION public.inactivate_client IS
  'Inativa um cliente e arquiva todos os cronogramas ativos dele em cascata. Requer role admin ou equipe.';

COMMENT ON FUNCTION public.reactivate_client IS
  'Reativa um cliente inativo. Cronogramas arquivados precisam ser reabertos manualmente. Requer role admin ou equipe.';
