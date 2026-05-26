-- ============================================================
-- VERIFICAÇÃO — cole no SQL Editor para confirmar que tudo
-- foi criado corretamente após rodar as duas migrations
-- ============================================================

-- 1. Verificar tabelas criadas
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- 2. Verificar enums criados
SELECT typname AS enum_name,
       array_agg(enumlabel ORDER BY enumsortorder) AS values
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE typname IN ('user_role','campaign_status','approval_status','post_status','comment_status','file_type')
GROUP BY typname;

-- 3. Verificar RLS ativo
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- 4. Verificar triggers
SELECT trigger_name, event_object_table, action_timing, event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table;
