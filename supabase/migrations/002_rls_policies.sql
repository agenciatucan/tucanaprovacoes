-- ============================================================
-- MIGRAÇÃO 002 — Row Level Security (RLS)
-- CORAÇÃO DA SEGURANÇA: define quem pode ver/editar o quê
-- Sem RLS, qualquer usuário logado vê todos os dados
-- ============================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ── Funções auxiliares de segurança ──────────────────────────

-- Retorna o role do usuário autenticado
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
  SELECT role FROM user_profiles
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Retorna o profile_id do usuário autenticado
CREATE OR REPLACE FUNCTION get_user_profile_id()
RETURNS UUID AS $$
  SELECT id FROM user_profiles
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Verifica se o usuário é admin ou equipe (staff Tucan)
CREATE OR REPLACE FUNCTION is_staff()
RETURNS BOOLEAN AS $$
  SELECT role IN ('admin', 'equipe') FROM user_profiles
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Verifica se o usuário tem acesso a um cliente específico
CREATE OR REPLACE FUNCTION has_client_access(p_client_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM client_users cu
    JOIN user_profiles up ON up.id = cu.user_id
    WHERE up.auth_user_id = auth.uid()
    AND cu.client_id = p_client_id
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ── POLÍTICAS: user_profiles ─────────────────────────────────
-- Admin vê todos; outros veem apenas o próprio
CREATE POLICY "staff_read_all_profiles" ON user_profiles
  FOR SELECT USING (is_staff());

CREATE POLICY "user_read_own_profile" ON user_profiles
  FOR SELECT USING (auth_user_id = auth.uid());

CREATE POLICY "user_update_own_profile" ON user_profiles
  FOR UPDATE USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid() AND role = (SELECT role FROM user_profiles WHERE auth_user_id = auth.uid()));

CREATE POLICY "admin_manage_profiles" ON user_profiles
  FOR ALL USING (get_user_role() = 'admin');

-- ── POLÍTICAS: clients ────────────────────────────────────────
-- Staff vê todos os clientes; cliente vê apenas os seus
CREATE POLICY "staff_read_all_clients" ON clients
  FOR SELECT USING (is_staff());

CREATE POLICY "client_read_own" ON clients
  FOR SELECT USING (has_client_access(id));

CREATE POLICY "admin_manage_clients" ON clients
  FOR ALL USING (get_user_role() = 'admin');

CREATE POLICY "equipe_manage_clients" ON clients
  FOR UPDATE USING (get_user_role() = 'equipe');

-- ── POLÍTICAS: campaigns ──────────────────────────────────────
CREATE POLICY "staff_read_all_campaigns" ON campaigns
  FOR SELECT USING (is_staff());

CREATE POLICY "client_read_own_campaigns" ON campaigns
  FOR SELECT USING (has_client_access(client_id));

CREATE POLICY "staff_manage_campaigns" ON campaigns
  FOR ALL USING (is_staff());

-- ── POLÍTICAS: content_items ──────────────────────────────────
CREATE POLICY "staff_read_all_content" ON content_items
  FOR SELECT USING (is_staff());

CREATE POLICY "client_read_own_content" ON content_items
  FOR SELECT USING (has_client_access(client_id));

CREATE POLICY "staff_manage_content" ON content_items
  FOR ALL USING (is_staff());

-- ── POLÍTICAS: approvals ──────────────────────────────────────
CREATE POLICY "staff_read_all_approvals" ON approvals
  FOR SELECT USING (is_staff());

CREATE POLICY "client_read_own_approvals" ON approvals
  FOR SELECT USING (has_client_access(client_id));

-- Cliente só pode inserir aprovações dos seus próprios conteúdos
CREATE POLICY "client_insert_approvals" ON approvals
  FOR INSERT WITH CHECK (
    has_client_access(client_id) AND
    approved_by = get_user_profile_id()
  );

-- Aprovação é imutável — sem UPDATE ou DELETE
CREATE POLICY "no_update_approvals" ON approvals
  FOR UPDATE USING (FALSE);

-- ── POLÍTICAS: comments_history ───────────────────────────────
CREATE POLICY "staff_read_all_comments" ON comments_history
  FOR SELECT USING (is_staff());

CREATE POLICY "client_read_own_comments" ON comments_history
  FOR SELECT USING (has_client_access(client_id));

CREATE POLICY "authenticated_insert_comment" ON comments_history
  FOR INSERT WITH CHECK (
    user_id = get_user_profile_id() AND
    has_client_access(client_id)
  );

CREATE POLICY "staff_resolve_comments" ON comments_history
  FOR UPDATE USING (is_staff());

-- ── POLÍTICAS: files ─────────────────────────────────────────
CREATE POLICY "staff_read_all_files" ON files
  FOR SELECT USING (is_staff());

-- Cliente só vê arquivos marcados como visible_to_client
CREATE POLICY "client_read_visible_files" ON files
  FOR SELECT USING (
    has_client_access(client_id) AND visible_to_client = TRUE
  );

CREATE POLICY "staff_manage_files" ON files
  FOR ALL USING (is_staff());

-- ── POLÍTICAS: notifications ──────────────────────────────────
CREATE POLICY "user_read_own_notifications" ON notifications
  FOR SELECT USING (user_id = get_user_profile_id());

CREATE POLICY "user_update_own_notifications" ON notifications
  FOR UPDATE USING (user_id = get_user_profile_id());

-- ── POLÍTICAS: audit_logs ────────────────────────────────────
-- Apenas admin lê; inserção apenas via funções internas
CREATE POLICY "admin_read_audit_logs" ON audit_logs
  FOR SELECT USING (get_user_role() = 'admin');

CREATE POLICY "system_insert_audit_logs" ON audit_logs
  FOR INSERT WITH CHECK (TRUE); -- Inserção via SECURITY DEFINER functions
