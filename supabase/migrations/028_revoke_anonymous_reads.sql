-- ============================================================
-- MIGRAÇÃO 028 — Remove leitura anônima e restringe leitura do cliente
--
-- PROBLEMA (verificado em produção em 2026-10-15, apenas leitura):
--   Com a chave anon (pública, vai no bundle do navegador) e SEM login era
--   possível ler campaigns (incluindo approval_token e access_code),
--   content_items (legendas etc.), public_access_sessions e listar o bucket
--   campaign-files. Essas policies não estão nas migrações do repositório —
--   foram criadas direto no painel. Com o approval_token, qualquer pessoa
--   aprova posts ou solicita ajustes pelo link público.
--
--   Além disso, as policies da 006 são PERMISSIVAS: no Postgres, policies
--   permissivas são combinadas com OR, então "client_read_own_campaigns"
--   (002) continuava liberando cronogramas em rascunho/arquivados para o
--   cliente via API, apesar da 006.
--
-- PRÉ-REQUISITO: publicar antes o código desta mesma alteração. A página
--   /acesso/[token] passou a ler posts com service role (escopado pelo token),
--   então deixa de depender dessas policies anônimas.
--
-- O QUE FAZ:
--   1. Remove, nas tabelas abaixo, policies de leitura que valem para anon
--      e não verificam o usuário (sem auth.uid()/is_staff()/has_client_access()...).
--   2. Troca as policies de leitura do cliente por versões que exigem
--      cronograma visível (mesma regra de CLIENT_VISIBLE_CAMPAIGN_STATUSES).
--   3. Remove leitura/listagem anônima de storage.objects nos buckets do portal
--      e cria SELECT só para staff (necessário para storage.remove()).
--      Os buckets continuam públicos: as URLs públicas dos arquivos seguem
--      funcionando, pois não passam por RLS.
--
-- Não apaga dados. Para conferir antes, rode só esta consulta:
--
--   SELECT schemaname, tablename, policyname, roles, cmd, qual
--   FROM pg_policies
--   WHERE (schemaname = 'public' AND tablename IN (
--           'campaigns','content_items','files','clients','public_access_sessions',
--           'public_approval_events','planning_schedules','planning_items'))
--      OR (schemaname = 'storage' AND tablename = 'objects')
--   ORDER BY tablename, policyname;
-- ============================================================

-- ── 1. Policies de leitura sem verificação de usuário ─────────
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'campaigns', 'content_items', 'files', 'clients',
        'public_access_sessions', 'public_approval_events',
        'planning_schedules', 'planning_items'
      )
      AND cmd IN ('SELECT', 'ALL')
      AND roles && ARRAY['anon', 'public']::name[]
      AND (
        qual IS NULL
        OR qual !~* '(auth\.uid|auth\.role|auth\.jwt|is_staff|has_client_access|get_user_role|get_user_profile_id)'
      )
  LOOP
    RAISE NOTICE 'Removendo policy anônima: %.% -> %', pol.schemaname, pol.tablename, pol.policyname;
    EXECUTE format('DROP POLICY %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
  END LOOP;
END $$;

-- ── 2. Leitura do cliente apenas em cronogramas visíveis ──────
DROP POLICY IF EXISTS "client_read_own_campaigns"  ON public.campaigns;
DROP POLICY IF EXISTS "client_read_own_content"    ON public.content_items;
DROP POLICY IF EXISTS "client_read_visible_files"  ON public.files;

DROP POLICY IF EXISTS "Clients can read visible campaigns only"                   ON public.campaigns;
DROP POLICY IF EXISTS "Clients can read content from visible campaigns only"      ON public.content_items;
DROP POLICY IF EXISTS "Clients can read visible files from visible campaigns only" ON public.files;

CREATE POLICY "Clients can read visible campaigns only"
ON public.campaigns
FOR SELECT
TO authenticated
USING (
  status IN ('enviado_para_aprovacao', 'em_revisao', 'aprovado', 'em_producao', 'finalizado')
  AND has_client_access(client_id)
);

CREATE POLICY "Clients can read content from visible campaigns only"
ON public.content_items
FOR SELECT
TO authenticated
USING (
  has_client_access(client_id)
  AND EXISTS (
    SELECT 1 FROM public.campaigns c
    WHERE c.id = content_items.campaign_id
      AND c.client_id = content_items.client_id
      AND c.status IN ('enviado_para_aprovacao', 'em_revisao', 'aprovado', 'em_producao', 'finalizado')
  )
);

CREATE POLICY "Clients can read visible files from visible campaigns only"
ON public.files
FOR SELECT
TO authenticated
USING (
  visible_to_client = TRUE
  AND has_client_access(client_id)
  AND EXISTS (
    SELECT 1 FROM public.campaigns c
    WHERE c.id = files.campaign_id
      AND c.client_id = files.client_id
      AND c.status IN ('enviado_para_aprovacao', 'em_revisao', 'aprovado', 'em_producao', 'finalizado')
  )
);

-- ── 3. Storage: sem listagem anônima nos buckets do portal ────
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND cmd IN ('SELECT', 'ALL')
      AND roles && ARRAY['anon', 'public']::name[]
      AND (qual IS NULL OR qual ~* '(campaign-files|client-logos)')
      AND (
        qual IS NULL
        OR qual !~* '(auth\.uid|auth\.role|auth\.jwt|is_staff|user_profiles)'
      )
  LOOP
    RAISE NOTICE 'Removendo policy anônima de storage: %', pol.policyname;
    EXECUTE format('DROP POLICY %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;

DROP POLICY IF EXISTS "staff_select_campaign_files" ON storage.objects;
CREATE POLICY "staff_select_campaign_files"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'campaign-files'
    AND (
      SELECT role FROM public.user_profiles
      WHERE auth_user_id = auth.uid() LIMIT 1
    ) IN ('admin', 'equipe')
  );

DROP POLICY IF EXISTS "staff_select_client_logos" ON storage.objects;
CREATE POLICY "staff_select_client_logos"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'client-logos'
    AND (
      SELECT role FROM public.user_profiles
      WHERE auth_user_id = auth.uid() LIMIT 1
    ) IN ('admin', 'equipe')
  );
