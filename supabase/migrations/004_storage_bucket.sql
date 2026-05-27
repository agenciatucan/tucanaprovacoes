-- ============================================================
-- MIGRAÇÃO 004 — Bucket de arquivos de campanha
--
-- • Adiciona storage_path em files (para exclusão de Storage)
-- • Cria o bucket campaign-files (público — URLs permanentes)
-- • Políticas de storage: apenas staff pode fazer upload/delete
-- ============================================================

-- ── 1. Coluna storage_path ──────────────────────────────────
-- Armazena o caminho relativo dentro do bucket para permitir
-- exclusão via supabase.storage.remove() sem depender da URL.
ALTER TABLE public.files
  ADD COLUMN IF NOT EXISTS storage_path TEXT;

-- ── 2. Bucket ───────────────────────────────────────────────
-- public = TRUE → getPublicUrl() retorna URL permanente acessível
-- sem autenticação, adequado para imagens/vídeos exibidos ao cliente.
-- allowed_mime_types = NULL → sem restrição de tipo; apenas o limite
-- de tamanho (50 MB) é aplicado. Isso evita erros com formatos menos
-- comuns como image/avif, image/heic, video/avi, etc.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'campaign-files',
  'campaign-files',
  TRUE,
  52428800, -- 50 MB por arquivo
  NULL       -- aceita qualquer tipo de arquivo
)
ON CONFLICT (id) DO NOTHING;

-- Se o bucket já existia com allowed_mime_types definidos,
-- remove a restrição para aceitar qualquer formato.
UPDATE storage.buckets
SET
  allowed_mime_types = NULL,
  file_size_limit    = 52428800
WHERE id = 'campaign-files';

-- ── 3. Políticas de Storage ─────────────────────────────────
-- Bucket é público para leitura (via getPublicUrl).
-- Escrita e exclusão restritas a staff (admin + equipe).

-- Upload: apenas staff autenticado
CREATE POLICY "staff_upload_campaign_files"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'campaign-files'
    AND (
      SELECT role FROM public.user_profiles
      WHERE auth_user_id = auth.uid()
      LIMIT 1
    ) IN ('admin', 'equipe')
  );

-- Exclusão: apenas staff autenticado
CREATE POLICY "staff_delete_campaign_files"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'campaign-files'
    AND (
      SELECT role FROM public.user_profiles
      WHERE auth_user_id = auth.uid()
      LIMIT 1
    ) IN ('admin', 'equipe')
  );

-- ── 4. Comentários ─────────────────────────────────────────
COMMENT ON COLUMN public.files.storage_path IS
  'Caminho relativo no bucket campaign-files (ex: {content_item_id}/{uuid}-{filename}). Usado para exclusão via storage.remove().';
