# Portal Tucan — Guia de Desenvolvimento

Documento interno para desenvolvedores que contribuem com o projeto. Para setup inicial, veja o [README.md](../README.md).

---

## Stack

| Camada | Tecnologia | Notas |
|---|---|---|
| Framework | Next.js 15 (App Router) | Server Components por padrão |
| Linguagem | TypeScript 5 (strict) | `noUncheckedIndexedAccess`, `noImplicitReturns` |
| Estilo | Tailwind CSS + CSS custom properties | Design tokens em `globals.css` |
| Banco | Supabase (PostgreSQL) | RLS ativo em todas as tabelas |
| Auth | Supabase Auth | Cookie-based via `@supabase/ssr` |
| Storage | Supabase Storage | Bucket `campaign-files` |
| Validação | Zod | Schemas em `src/lib/validations/schemas.ts` |
| E-mails | Resend | Templates em `src/lib/email/` |
| Deploy | Vercel | |

---

## Arquitetura de segurança

### Row Level Security (RLS)

**Todo acesso ao banco passa pelo RLS.** As políticas estão em `supabase/migrations/002_rls_policies.sql` e definem:

| Role | O que pode ver |
|---|---|
| `admin` | Tudo |
| `equipe` | Tudo exceto configurações de billing |
| `cliente` | Apenas dados dos seus próprios cronogramas |

Funções SQL auxiliares (`is_staff()`, `has_client_access()`, `get_user_profile_id()`) centralizam a lógica.

### Regras de ouro de segurança

1. **Usar `getUser()`** — nunca `getSession()` — para verificar auth no servidor. `getUser()` valida o token com o servidor Supabase; `getSession()` só decodifica localmente.
2. **`SUPABASE_SERVICE_ROLE_KEY`** só dentro de Server Actions. Nunca no cliente. Ela bypassa o RLS.
3. **`internal_notes`** nunca aparecem em queries feitas com o cliente Supabase no browser.
4. **Arquivos** só aparecem para o cliente quando `visible_to_client = true`.
5. **Tokens de aprovação** têm expiração (90 dias) e são invalidados ao regenerar.
6. **Validar com Zod** antes de qualquer chamada ao banco.

---

## Padrões de código

### Server Components vs Client Components

```
Server Component (padrão)     →  busca dados, sem interatividade
Client Component ('use client') →  formulários, estado, browser APIs
```

Só adicionar `'use client'` quando necessário. Componentes de formulário (`CampaignForm`, `PostForm`, etc.) são client; páginas de listagem são server.

### Server Actions

Todas as mutações usam Server Actions em `src/actions/`. Padrão de retorno:

```typescript
// Sempre retornar um dos dois shapes:
type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string }
```

Exemplo correto:

```typescript
// src/actions/campaigns.ts
export async function createCampaign(input: unknown) {
  // 1. Validar entrada com Zod
  const parsed = campaignSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: 'Dados inválidos.' };

  // 2. Verificar autenticação
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Não autenticado.' };

  // 3. Operação no banco
  const { data, error } = await supabase.from('campaigns').insert({ ... }).select().single();
  if (error) return { success: false, error: error.message };

  // 4. Invalidar cache
  revalidatePath('/admin/cronogramas');

  return { success: true, data };
}
```

### Rotas dinâmicas com `typedRoutes`

O projeto usa `experimental.typedRoutes: true` no Next.js. Isso significa que valores dinâmicos em `href` e `router.push()` precisam de `as Route`:

```typescript
import type { Route } from 'next';

// Link
<Link href={`/admin/cronogramas/${id}` as Route}>...</Link>

// router.push
router.push(`/admin/clientes/${id}` as Route);
```

### Convenções de nomenclatura

| Tipo | Convenção | Exemplo |
|---|---|---|
| Componente React | PascalCase | `CampaignForm.tsx` |
| Server Action | camelCase | `createCampaign` |
| Página Next.js | `page.tsx` | `app/(admin)/admin/clientes/page.tsx` |
| Tipos DB | gerados | `src/types/database.types.ts` |
| Schemas Zod | `{nome}Schema` | `campaignSchema` |

---

## Banco de dados

### Diagrama simplificado

```
auth.users (Supabase Auth)
    └── user_profiles (role: admin | equipe | cliente)
             │
clients ─────┤
    │        └── client_users (relação usuário ↔ cliente)
    │
campaigns (cronogramas)
    │   ├── approval_token (link de acesso do cliente)
    │
content_items (posts/cards)
    │   ├── theme_status, caption_status, artwork_status
    │   └── general_status (calculado por trigger)
    │
approvals (registro imutável de cada aprovação)
comments_history (observações abertas/resolvidas)
files (uploads — bucket campaign-files no Storage)
```

### Triggers importantes

| Trigger | Quando dispara | O que faz |
|---|---|---|
| `trg_auto_post_status` | UPDATE em `content_items` | Auto-aprova post quando tema+legenda+arte aprovados |
| `trg_on_auth_user_created` | INSERT em `auth.users` | Cria `user_profiles` automaticamente |
| `trg_*_updated_at` | UPDATE em qualquer tabela | Atualiza `updated_at` |

---

## Status das fases MVP

| Fase | Descrição | Status |
|---|---|---|
| 1 | Setup: Next.js + Tailwind + Supabase + auth | ✅ Concluído |
| 2 | Autenticação: login, perfis, middleware | ✅ Concluído |
| 3 | Admin: clientes e cronogramas | ✅ Concluído |
| 4 | Posts/cards: CRUD completo | ✅ Concluído |
| 5 | Portal cliente: visualização + aprovação | ✅ Concluído |
| 6 | Histórico: approvals + comments_history | ✅ Concluído |
| 7 | Kanban + Calendário interno | ✅ Concluído |
| 8 | Upload de arquivos (Supabase Storage) | 🔲 Estrutura criada, UI pendente |
| 9 | E-mails automáticos (Resend) | 🔲 A implementar |

---

## Checklist antes de cada PR / commit

- [ ] `npm run type-check` sem erros
- [ ] `npm run build` passa completo
- [ ] Nenhum dado sensível exposto ao cliente (`internal_notes`, tokens, service key)
- [ ] Todo input validado com Zod na Server Action
- [ ] `revalidatePath()` chamado após mutações
- [ ] RLS protege a query correspondente (verifique as políticas)
- [ ] Sem `as any` desnecessário (use `as Route` apenas para rotas dinâmicas tipadas)

---

## Variáveis de CSS (design tokens)

Definidas em `src/app/globals.css`. As principais:

```css
--green:     #25411e   /* cor primária — botões, links, sidebar */
--orange:    #eb6013   /* cor de destaque — alertas, avisos */
--bg:        #f6f6f6   /* fundo geral */
--ink:       #1a1a1a   /* texto principal */
--muted:     #666666   /* texto secundário */
--line:      #e5e5e5   /* bordas e divisores */
```

Classes utilitárias do design system:

```css
.card          /* container com sombra e borda */
.btn           /* botão base */
.btn-primary   /* botão verde */
.btn-ghost     /* botão transparente */
.input         /* campo de formulário */
.chip          /* tag/badge pequeno */
.status        /* badge de status colorido */
.fmt           /* badge de formato de post */
.eyebrow       /* label acima de título */
.muted         /* texto cinza */
.tiny          /* texto menor */
.field         /* wrapper de campo (label + input) */
.field-label   /* label de campo */
```
