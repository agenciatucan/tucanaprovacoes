# Portal Tucan 🦜

Portal web para gestão e aprovação de cronogramas de conteúdo entre a **Agência Tucan** e seus clientes. A agência cria os posts, o cliente aprova tema, legenda e arte — tudo em um lugar, sem PDF, sem planilha, sem WhatsApp.

---

## Índice

- [Stack](#stack)
- [Pré-requisitos](#pré-requisitos)
- [Configuração do banco (Supabase)](#configuração-do-banco-supabase)
- [Instalação local](#instalação-local)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Primeiro usuário admin](#primeiro-usuário-admin)
- [Scripts disponíveis](#scripts-disponíveis)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Fluxo de aprovação](#fluxo-de-aprovação)
- [Deploy (Vercel)](#deploy-vercel)
- [Redes de certificado corporativo](#redes-de-certificado-corporativo)

---

## Stack

| Camada | Tecnologia | Versão |
|---|---|---|
| Framework | [Next.js](https://nextjs.org) | 15.x (App Router) |
| Linguagem | TypeScript | 5.x (strict) |
| Estilo | Tailwind CSS + CSS custom props | 3.x |
| Banco de dados | [Supabase](https://supabase.com) (PostgreSQL) | — |
| Autenticação | Supabase Auth | — |
| Storage | Supabase Storage | — |
| Validação | [Zod](https://zod.dev) | 3.x |
| Notificações | [Sonner](https://sonner.emilkowal.ski) | 1.x |
| E-mails | [Resend](https://resend.com) | 4.x |
| Deploy | [Vercel](https://vercel.com) | — |

---

## Pré-requisitos

### Ferramentas locais

| Ferramenta | Versão mínima | Como instalar |
|---|---|---|
| **Node.js** | 20.x LTS | [nodejs.org](https://nodejs.org) |
| **npm** | 10.x (vem com Node 20) | incluso no Node |
| **Git** | qualquer recente | [git-scm.com](https://git-scm.com) |

> **Verifique sua versão:** `node -v` deve mostrar `v20.x.x` ou superior.

### Contas necessárias (gratuitas para começar)

| Serviço | Para que serve | Link |
|---|---|---|
| **Supabase** | Banco de dados + Auth + Storage | [supabase.com](https://supabase.com) — free tier suficiente |
| **Vercel** | Deploy do Next.js | [vercel.com](https://vercel.com) — free tier suficiente |
| **Resend** *(opcional)* | E-mails automáticos | [resend.com](https://resend.com) — 3.000 e-mails/mês grátis |

> Resend só é necessário se você quiser e-mails de notificação. O portal funciona sem ele.

---

## Configuração do banco (Supabase)

Este é o passo mais importante. Faça isso **antes** de rodar a aplicação.

### Passo 1 — Criar um projeto Supabase

1. Acesse [supabase.com](https://supabase.com) e crie uma conta (ou faça login)
2. Clique em **New project**
3. Escolha um nome (ex.: `portal-tucan`) e uma senha forte para o banco
4. Selecione a região mais próxima (ex.: South America - São Paulo)
5. Aguarde a criação (~2 minutos)

### Passo 2 — Obter as credenciais

1. No painel do projeto, vá em **Settings → API**
2. Copie:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** (em Project API Keys) → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** (em Project API Keys — ⚠️ nunca expor no cliente) → `SUPABASE_SERVICE_ROLE_KEY`

### Passo 3 — Aplicar as migrações SQL

As migrações estão em `supabase/migrations/`. Execute-as na ordem pelo **SQL Editor** do Supabase:

1. Abra **SQL Editor** no painel do Supabase
2. Clique em **New query**
3. Cole o conteúdo de `supabase/migrations/001_initial_schema.sql` e execute (**RUN**)
4. Crie outra query, cole `supabase/migrations/002_rls_policies.sql` e execute
5. Para verificar que tudo foi criado, execute o conteúdo de `supabase/seed/002_verify_setup.sql`

> **Alternativa via CLI (usuários avançados):**
> ```bash
> npm install -g supabase
> supabase login
> supabase link --project-ref SEU_PROJECT_REF   # encontre em Settings → General
> supabase db push
> ```

### Passo 4 — Configurar o Storage (para uploads de arquivos)

1. No painel do Supabase, vá em **Storage**
2. Clique em **New bucket**
3. Nome: `campaign-files`
4. Marque como **Public bucket** (os arquivos precisam de URL pública para o cliente visualizar)
5. Clique em **Save**

---

## Instalação local

```bash
# 1. Clone o repositório
git clone https://github.com/sua-org/portal-tucan.git
cd portal-tucan

# 2. Instale as dependências
npm install

# 3. Configure as variáveis de ambiente
cp .env.example .env.local
# Abra .env.local e preencha com suas credenciais do Supabase
```

Abra `.env.local` e preencha pelo menos estas variáveis obrigatórias:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

```bash
# 4. Suba o servidor de desenvolvimento
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000). Você verá a landing page do portal.

---

## Variáveis de ambiente

| Variável | Obrigatória | Onde encontrar |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ Sim | Supabase → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ Sim | Supabase → Settings → API → anon public |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ Sim | Supabase → Settings → API → service_role |
| `NEXT_PUBLIC_APP_URL` | ✅ Sim | `http://localhost:3000` em dev, URL da Vercel em prod |
| `NEXT_PUBLIC_APP_NAME` | Não | Nome exibido nos e-mails (default: Portal Tucan) |
| `RESEND_API_KEY` | Não | [resend.com](https://resend.com) → API Keys |
| `RESEND_FROM_EMAIL` | Não | E-mail remetente verificado no Resend |
| `RESEND_FROM_NAME` | Não | Nome do remetente |
| `APPROVAL_TOKEN_SECRET` | Não | Gere: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |

> ⚠️ **Nunca commit o `.env.local`** — ele já está no `.gitignore`.

---

## Primeiro usuário admin

Depois de rodar as migrações, você precisa criar um usuário admin para acessar o painel:

### Opção A — Pelo painel Supabase (recomendada)

1. No Supabase, vá em **Authentication → Users**
2. Clique em **Invite user** e coloque o seu e-mail
3. Aceite o convite no e-mail e defina uma senha
4. Abra o **SQL Editor** e execute:

```sql
UPDATE user_profiles
SET role = 'admin'
WHERE email = 'seu@email.com';
```

5. Pronto — acesse `/login` com esse e-mail e senha

### Opção B — Criar direto pelo SQL (dev apenas)

```sql
-- No SQL Editor do Supabase, crie um usuário de teste com senha conhecida
-- (necessita de acesso à tabela auth.users — só funciona via service role)

-- Depois de criar pelo Authentication → Users, atualize o role:
UPDATE user_profiles SET role = 'admin' WHERE email = 'admin@seudominio.com';
```

> Veja também `supabase/seed/001_admin_user.sql` para um script completo com cliente de teste.

---

## Scripts disponíveis

```bash
npm run dev          # Servidor de desenvolvimento (http://localhost:3000)
npm run build        # Build de produção
npm run start        # Inicia o build de produção localmente
npm run lint         # ESLint
npm run type-check   # Verificação de tipos TypeScript (sem compilar)
```

---

## Estrutura do projeto

```
portal-tucan/
├── src/
│   ├── app/
│   │   ├── (public)/        # Rotas abertas: /, /login, /acesso, /acesso/[token]
│   │   ├── (admin)/         # Painel interno (roles: admin, equipe)
│   │   │   └── admin/
│   │   │       ├── page.tsx              # Dashboard
│   │   │       ├── clientes/             # CRUD de clientes
│   │   │       ├── cronogramas/          # CRUD de campanhas
│   │   │       ├── posts/[id]/           # CRUD de posts
│   │   │       ├── kanban/               # Visão Kanban por status
│   │   │       ├── calendario/           # Visão cronológica
│   │   │       └── observacoes/          # Fila de comentários abertos
│   │   └── (cliente)/       # Área do cliente (role: cliente)
│   │       └── cliente/
│   │           ├── page.tsx              # Lista de cronogramas
│   │           ├── cronogramas/[id]/     # Ver cronograma
│   │           └── posts/[id]/           # Ver + aprovar post
│   ├── actions/             # Server Actions (mutações)
│   │   ├── auth.ts          # signIn, signOut, verifyApprovalToken
│   │   ├── campaigns.ts     # CRUD + envio para aprovação
│   │   ├── clients.ts       # CRUD de clientes
│   │   ├── content-items.ts # CRUD de posts
│   │   ├── approvals.ts     # submitApproval, approveCampaign
│   │   ├── comments.ts      # resolveComment, addInternalComment
│   │   └── files.ts         # deleteFile, toggleFileVisibility
│   ├── components/
│   │   ├── ui/              # Componentes base (Icon, StatusBadge, TopBar…)
│   │   ├── layout/          # AdminSidebar, ClientLayout…
│   │   ├── admin/           # CampaignForm, ClientForm, PostForm, CampaignActions…
│   │   ├── auth/            # LoginForm, TokenAccessForm, TokenPasteForm
│   │   └── aprovacao/       # ApprovalPanel
│   ├── lib/
│   │   ├── supabase/        # Clientes SSR (server.ts) e browser (client.ts)
│   │   ├── validations/     # Schemas Zod (schemas.ts)
│   │   └── utils/           # formatDate, status labels, cn()
│   ├── middleware.ts         # Proteção de rotas + redirecionamento por role
│   └── types/
│       └── database.types.ts # Tipos TypeScript das tabelas
├── supabase/
│   ├── migrations/
│   │   ├── 001_initial_schema.sql  # Tabelas, triggers, funções
│   │   └── 002_rls_policies.sql    # Row Level Security
│   └── seed/
│       ├── 001_admin_user.sql      # Script para criar admin + cliente de teste
│       └── 002_verify_setup.sql    # Queries de verificação
├── public/
│   └── assets/              # Logo, imagem do tucano
├── docs/
│   └── DESENVOLVIMENTO.md   # Guia de padrões e arquitetura
├── .env.example             # Template de variáveis (commite este, não o .env.local)
├── next.config.ts           # Config Next.js (typedRoutes, headers de segurança)
├── tailwind.config.ts       # Tema Tailwind
└── tsconfig.json            # TypeScript strict mode
```

---

## Fluxo de aprovação

```
Agência cria campanha  →  Adiciona posts  →  "Enviar para aprovação"
        ↓
Cliente recebe link único (/acesso/TOKEN)
        ↓
Aprova tema / legenda / arte por post
        ↓
Todos aprovados  →  Campanha aprovada  →  Produção
```

**Roles:**
- `admin` — acesso total ao painel
- `equipe` — acesso ao painel (sem configurações)
- `cliente` — vê apenas seus cronogramas, aprova posts

**Acesso do cliente:**
- Por login (e-mail + senha) → vai para `/cliente`
- Por link de aprovação (sem login) → `/acesso/[token]` → valida e-mail → cronograma

---

## Deploy (Vercel)

```bash
# Instalar Vercel CLI
npm install -g vercel

# Fazer login
vercel login

# Deploy (primeira vez — vai fazer perguntas de configuração)
vercel

# Deploy de produção
vercel --prod
```

**Configurar variáveis de ambiente na Vercel** (Settings → Environment Variables):

| Variável | Ambiente |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production, Preview, Development |
| `SUPABASE_SERVICE_ROLE_KEY` | Production, Preview |
| `NEXT_PUBLIC_APP_URL` | Production (ex.: `https://portal.agenciatucan.com.br`) |
| `RESEND_API_KEY` | Production |
| `RESEND_FROM_EMAIL` | Production |

**Domínio customizado:**
1. Vercel → Project → Settings → Domains
2. Adicionar `portal.agenciatucan.com.br`
3. DNS: CNAME `portal` → `cname.vercel-dns.com`
4. Aguardar propagação DNS (até 48h)

> Depois de configurar o domínio, atualize também a URL em Supabase:
> **Authentication → URL Configuration** → Site URL: `https://portal.agenciatucan.com.br`

---

## Redes de certificado corporativo

Se você estiver em uma rede com inspeção de SSL (proxy corporativo, Zscaler, etc.), o npm e o Next.js podem rejeitar certificados. O repositório já inclui contornos:

- `.npmrc` tem `strict-ssl=false` (desabilita validação SSL no npm)
- `npm run dev` usa `NODE_TLS_REJECT_UNAUTHORIZED=0` (desabilita no Node.js)

> ⚠️ **Em produção, remova essas configurações.** Elas existem apenas para desenvolvimento em redes corporativas com interceptação SSL. No servidor Vercel ou em uma máquina pessoal normal, delete o `.npmrc` e troque o script `dev` por simplesmente `next dev`.

---

## Licença

Uso interno — Agência Tucan Marketing Digital.
