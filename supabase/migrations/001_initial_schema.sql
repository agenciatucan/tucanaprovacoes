-- ============================================================
-- MIGRAÇÃO 001 — Esquema completo do Portal Tucan
-- Baseado no Documento Técnico MVP v1 + melhorias de segurança
-- Execute: supabase db push
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── ENUMS ─────────────────────────────────────────────────────
CREATE TYPE user_role        AS ENUM ('admin', 'equipe', 'cliente');
CREATE TYPE client_status    AS ENUM ('ativo', 'inativo');
CREATE TYPE campaign_type    AS ENUM ('mensal', 'quinzenal', 'semanal', 'campanha');

-- Status completo do cronograma (conforme PDF seção 10.5)
CREATE TYPE campaign_status  AS ENUM (
  'rascunho',
  'enviado_para_aprovacao',
  'em_revisao',
  'aprovado',
  'em_producao',
  'finalizado',
  'arquivado'
);

-- Status de aprovação por campo (tema/legenda/arte)
CREATE TYPE approval_status  AS ENUM (
  'aguardando',
  'aprovado',
  'ajuste_solicitado',
  'substituir_tema',   -- exclusivo para tema (PDF seção 10.1)
  'nao_se_aplica'      -- exclusivo para arte/prévia (PDF seção 10.3)
);

-- Status geral do post (PDF seção 10.4)
CREATE TYPE post_status      AS ENUM (
  'pendente',
  'em_revisao',
  'aprovado',
  'em_producao',
  'finalizado'
);

CREATE TYPE comment_status   AS ENUM ('aberta', 'resolvida');

CREATE TYPE file_type        AS ENUM (
  'imagem', 'video', 'pdf', 'roteiro', 'referencia', 'capa'
);

-- Tipos de aprovação registráveis (PDF seção 12.6)
CREATE TYPE approval_type    AS ENUM (
  'tema', 'legenda', 'arte', 'post_completo', 'cronograma'
);

-- ── TABELAS ───────────────────────────────────────────────────

-- Perfis de usuário (PDF seção 12.1)
CREATE TABLE user_profiles (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_user_id    UUID        NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name            TEXT        NOT NULL,
  email           TEXT        NOT NULL UNIQUE,
  role            user_role   NOT NULL DEFAULT 'cliente',
  avatar_url      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Clientes da agência (PDF seção 12.2)
CREATE TABLE clients (
  id                 UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  name               TEXT          NOT NULL,
  company_name       TEXT          NOT NULL,
  email              TEXT          NOT NULL,
  whatsapp           TEXT,
  internal_owner_id  UUID          REFERENCES user_profiles(id) ON DELETE SET NULL,
  status             client_status NOT NULL DEFAULT 'ativo',
  internal_notes     TEXT,
  created_at         TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Relação usuário ↔ cliente (PDF seção 12.3)
-- Preparada para múltiplos aprovadores no futuro
CREATE TABLE client_users (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id  UUID        NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  role       TEXT        NOT NULL DEFAULT 'aprovador' CHECK (role IN ('aprovador', 'viewer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (client_id, user_id)
);

-- Cronogramas e campanhas (PDF seção 12.4)
CREATE TABLE campaigns (
  id               UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id        UUID            NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name             TEXT            NOT NULL,
  type             campaign_type   NOT NULL,
  start_date       DATE            NOT NULL,
  end_date         DATE,
  period_label     TEXT            NOT NULL,
  overview         TEXT,
  status           campaign_status NOT NULL DEFAULT 'rascunho',
  approval_token   TEXT            NOT NULL UNIQUE,
  -- SEGURANÇA: token com expiração (não existe no PDF, adicionado por segurança)
  token_expires_at TIMESTAMPTZ     NOT NULL DEFAULT (NOW() + INTERVAL '90 days'),
  is_locked        BOOLEAN         NOT NULL DEFAULT FALSE,
  created_by       UUID            NOT NULL REFERENCES user_profiles(id),
  created_at       TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- Posts/cards de conteúdo (PDF seção 12.5)
CREATE TABLE content_items (
  id               UUID             PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id      UUID             NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  client_id        UUID             NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  week_label       TEXT             NOT NULL,
  order_index      INTEGER          NOT NULL DEFAULT 0,
  -- Formatos: Reels, Carrossel, Post estático, Story, Outro (PDF seção 8.7)
  format           TEXT             NOT NULL CHECK (format IN ('reels','carrossel','post_estatico','story','outro')),
  title            TEXT             NOT NULL,
  theme            TEXT,
  objective        TEXT,
  creative_concept TEXT,
  caption          TEXT,
  script           TEXT,               -- Obrigatório para Reels
  reference_url    TEXT,
  internal_notes   TEXT,               -- NUNCA exibido para o cliente
  -- NOTA: client_note_current do PDF foi movido para comments_history
  -- para preservar histórico completo e evitar sobrescrita
  theme_status     approval_status  NOT NULL DEFAULT 'aguardando',
  caption_status   approval_status  NOT NULL DEFAULT 'aguardando',
  artwork_status   approval_status  NOT NULL DEFAULT 'aguardando',
  general_status   post_status      NOT NULL DEFAULT 'pendente',
  is_locked        BOOLEAN          NOT NULL DEFAULT FALSE,
  created_by       UUID             NOT NULL REFERENCES user_profiles(id),
  created_at       TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  -- Garante que índice de ordenação é único por cronograma
  UNIQUE (campaign_id, order_index)
);

-- Registro imutável de aprovações (PDF seção 12.6)
-- NUNCA deletar ou atualizar — é o rastro auditável de tudo
CREATE TABLE approvals (
  id               UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_item_id  UUID          REFERENCES content_items(id) ON DELETE SET NULL,
  campaign_id      UUID          NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  client_id        UUID          NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  approval_type    approval_type NOT NULL,
  status           approval_status NOT NULL,
  note             TEXT,           -- Obrigatório quando status=ajuste_solicitado
  approved_by      UUID          NOT NULL REFERENCES user_profiles(id),
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
  -- Sem updated_at: este registro é imutável por design
);

-- Histórico de observações/comentários (PDF seção 12.7)
CREATE TABLE comments_history (
  id               UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_item_id  UUID           NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
  campaign_id      UUID           NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  client_id        UUID           NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  user_id          UUID           NOT NULL REFERENCES user_profiles(id),
  message          TEXT           NOT NULL,
  status           comment_status NOT NULL DEFAULT 'aberta',
  -- Status do post no momento do comentário (contexto histórico)
  snapshot_theme_status   approval_status,
  snapshot_caption_status approval_status,
  snapshot_artwork_status approval_status,
  created_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  resolved_at      TIMESTAMPTZ,
  resolved_by      UUID           REFERENCES user_profiles(id)
);

-- Arquivos anexados (PDF seção 12.8)
CREATE TABLE files (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_item_id  UUID        NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
  campaign_id      UUID        NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  client_id        UUID        NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  file_name        TEXT        NOT NULL,
  file_url         TEXT        NOT NULL,
  file_type        file_type   NOT NULL,
  file_size_bytes  BIGINT      NOT NULL DEFAULT 0,
  -- Se FALSE, cliente não vê (PDF seção 8.7 "Visível para cliente: sim/não")
  visible_to_client BOOLEAN    NOT NULL DEFAULT FALSE,
  uploaded_by      UUID        NOT NULL REFERENCES user_profiles(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Notificações internas (PDF seção 12.9)
CREATE TABLE notifications (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID        NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  client_id        UUID        REFERENCES clients(id) ON DELETE CASCADE,
  campaign_id      UUID        REFERENCES campaigns(id) ON DELETE CASCADE,
  content_item_id  UUID        REFERENCES content_items(id) ON DELETE CASCADE,
  type             TEXT        NOT NULL,
  title            TEXT        NOT NULL,
  message          TEXT        NOT NULL,
  read_at          TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Audit log — NÃO está no PDF, adicionado por boas práticas de segurança
-- Rastreia: quem fez o quê, quando, em qual registro, IP de onde
CREATE TABLE audit_logs (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID        REFERENCES user_profiles(id),
  action      TEXT        NOT NULL,  -- 'create', 'update', 'delete', 'approve', 'login'
  table_name  TEXT        NOT NULL,
  record_id   UUID,
  old_values  JSONB,
  new_values  JSONB,
  ip_address  INET,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── ÍNDICES ─────────────────────────────────────────────────────
CREATE INDEX idx_campaigns_client_id      ON campaigns(client_id);
CREATE INDEX idx_campaigns_status         ON campaigns(status);
CREATE INDEX idx_campaigns_token          ON campaigns(approval_token);
CREATE INDEX idx_campaigns_token_expires  ON campaigns(token_expires_at);
CREATE INDEX idx_content_items_campaign   ON content_items(campaign_id);
CREATE INDEX idx_content_items_client     ON content_items(client_id);
CREATE INDEX idx_content_items_status     ON content_items(general_status);
CREATE INDEX idx_content_items_week       ON content_items(campaign_id, week_label);
CREATE INDEX idx_content_items_order      ON content_items(campaign_id, order_index);
CREATE INDEX idx_approvals_campaign       ON approvals(campaign_id);
CREATE INDEX idx_approvals_item           ON approvals(content_item_id);
CREATE INDEX idx_approvals_client         ON approvals(client_id);
CREATE INDEX idx_comments_item            ON comments_history(content_item_id);
CREATE INDEX idx_comments_campaign        ON comments_history(campaign_id);
CREATE INDEX idx_comments_status          ON comments_history(status) WHERE status = 'aberta';
CREATE INDEX idx_files_item               ON files(content_item_id);
CREATE INDEX idx_files_visible            ON files(content_item_id, visible_to_client);
CREATE INDEX idx_notifications_user       ON notifications(user_id);
CREATE INDEX idx_notifications_unread     ON notifications(user_id, read_at) WHERE read_at IS NULL;
CREATE INDEX idx_audit_user_action        ON audit_logs(user_id, action);
CREATE INDEX idx_audit_table_record       ON audit_logs(table_name, record_id);
CREATE INDEX idx_client_users_client      ON client_users(client_id);
CREATE INDEX idx_client_users_user        ON client_users(user_id);

-- ── TRIGGER: updated_at automático ─────────────────────────────
CREATE OR REPLACE FUNCTION fn_update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at();

CREATE TRIGGER trg_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at();

CREATE TRIGGER trg_campaigns_updated_at
  BEFORE UPDATE ON campaigns
  FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at();

CREATE TRIGGER trg_content_items_updated_at
  BEFORE UPDATE ON content_items
  FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at();

-- ── TRIGGER: status geral do post automático ─────────────────────
-- PDF seção 11.7: post vira "aprovado" automaticamente quando
-- tema + legenda + arte todos aprovados (ou arte = nao_se_aplica)
CREATE OR REPLACE FUNCTION fn_auto_update_post_status()
RETURNS TRIGGER AS $$
BEGIN
  IF  NEW.theme_status   = 'aprovado'
  AND NEW.caption_status = 'aprovado'
  AND NEW.artwork_status IN ('aprovado', 'nao_se_aplica')
  AND NEW.general_status NOT IN ('em_producao', 'finalizado')
  THEN
    NEW.general_status = 'aprovado';
  END IF;

  -- Se qualquer ajuste for solicitado, post vai para em_revisao
  IF  NEW.theme_status   = 'ajuste_solicitado'
   OR NEW.caption_status = 'ajuste_solicitado'
   OR NEW.artwork_status = 'ajuste_solicitado'
  THEN
    NEW.general_status = 'em_revisao';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_auto_post_status
  BEFORE UPDATE ON content_items
  FOR EACH ROW EXECUTE FUNCTION fn_auto_update_post_status();

-- ── TRIGGER: criar perfil ao registrar usuário ──────────────────
CREATE OR REPLACE FUNCTION fn_handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (auth_user_id, name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'cliente')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION fn_handle_new_user();

-- ── FUNÇÃO: verificar se cronograma pode ser aprovado ───────────
-- PDF seção 9.4: botão de aprovação completa só aparece quando
-- todos os posts estão aprovados OU admin libera manualmente
CREATE OR REPLACE FUNCTION fn_can_approve_campaign(p_campaign_id UUID)
RETURNS BOOLEAN AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM content_items
    WHERE campaign_id = p_campaign_id
    AND general_status NOT IN ('aprovado', 'finalizado')
    AND is_locked = FALSE
  );
$$ LANGUAGE sql STABLE;
