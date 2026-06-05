-- ============================================================
-- MIGRAÇÃO 011 — Logo do cliente
--
-- • Adiciona logo_url na tabela clients
-- • Cria bucket client-logos (público, 5 MB, apenas imagens)
-- • Políticas: staff faz upload/delete; leitura pública via URL
-- ============================================================

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS logo_url TEXT;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'client-logos',
  'client-logos',
  TRUE,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "staff_upload_client_logos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'client-logos'
    AND (
      SELECT role FROM public.user_profiles
      WHERE auth_user_id = auth.uid() LIMIT 1
    ) IN ('admin', 'equipe')
  );

CREATE POLICY "staff_delete_client_logos"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'client-logos'
    AND (
      SELECT role FROM public.user_profiles
      WHERE auth_user_id = auth.uid() LIMIT 1
    ) IN ('admin', 'equipe')
  );
