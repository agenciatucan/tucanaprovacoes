-- ============================================================
-- SEED — Criar primeiro usuário admin
-- Execute no SQL Editor do Supabase DEPOIS das migrations
-- ============================================================

-- PASSO 1: Crie o usuário pelo painel em
-- Authentication → Users → "Invite user"
-- Use o e-mail: seu@email.com, e anote o UUID gerado.

-- PASSO 2: Atualize o role dele para admin
-- Troque 'SEU_EMAIL_AQUI' pelo e-mail que você cadastrou:

UPDATE user_profiles
SET role = 'admin'
WHERE email = 'SEU_EMAIL_AQUI';

-- PASSO 3: Verificar
SELECT id, name, email, role FROM user_profiles;

-- ============================================================
-- Para criar um cliente de teste completo:
-- ============================================================

-- Inserir cliente fictício para testar o portal
INSERT INTO clients (name, company_name, email, whatsapp, status)
VALUES ('Dr. Rafael Souza', 'Clínica Urologia Souza', 'rafael@clinicasouza.com.br', '(45) 99999-9999', 'ativo');

-- Ver clientes cadastrados
SELECT id, name, company_name, status FROM clients;
