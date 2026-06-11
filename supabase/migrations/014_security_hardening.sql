-- ============================================================
-- 014 — Security hardening
-- 1. Restringe MIME types aceitos pelo bucket campaign-files
-- 2. Corrige policy de INSERT em audit_logs (WITH CHECK TRUE → FALSE)
--    O rate limiter usa service role (bypassa RLS) — clientes autenticados
--    não devem inserir diretamente na tabela de auditoria.
-- ============================================================

-- 1. MIME types permitidos no bucket de uploads
UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'application/pdf',
  'text/plain'
]
WHERE id = 'campaign-files';

-- 2. Audit logs: apenas service role (que bypassa RLS) pode inserir
DROP POLICY IF EXISTS "system_insert_audit_logs" ON audit_logs;

CREATE POLICY "system_insert_audit_logs" ON audit_logs
  FOR INSERT WITH CHECK (FALSE);
-- Nota: o rate limiter e outras funções internas usam getSupabaseServiceClient()
-- que bypassa RLS por completo — a policy WITH CHECK (FALSE) não os afeta.
-- Ela apenas impede que sessões autenticadas (anon key) insiram diretamente.
