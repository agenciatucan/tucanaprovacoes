# QA — Portal Tucan

Registro dos testes de qualidade feitos no projeto e de como repeti-los.

## Como rodar a checagem completa

```bash
npm run type-check   # tipos
npm run lint         # 0 erros esperado (warnings preexistentes)
npm run build        # build de produção
npm run test:e2e     # Playwright (desktop + celular) contra localhost:3000
```

Para rodar os E2E contra produção depois de um deploy:

```bash
E2E_BASE_URL=https://portal.agenciatucan.com.br npx playwright test
```

## Regras de segurança dos testes

- O `.env.local` aponta para o **Supabase de produção** (não há banco de teste).
- Por isso os testes em `e2e/` são **somente leitura**: não fazem login, não enviam
  formulários que gravam dados e não disparam e-mail/WhatsApp.
- Testes que precisem gravar dados exigem um projeto Supabase de teste separado.

## Cobertura atual (`e2e/public-and-auth.spec.ts`)

- Rotas `/admin/*` e `/cliente/*` redirecionam para `/login` sem sessão.
- Login: campos rotulados, navegação por teclado, sem erros no console, sem rolagem
  horizontal no celular, formulário faz POST sem JavaScript (senha nunca na URL).
- Recuperação de senha acessível deslogado; `/definir-senha` sem sessão oferece novo link.
- `/auth/confirm` inválido volta ao login com aviso; `/auth/callback` ignora `next` externo.
- Links públicos `/acesso/...` com token inválido ou curingas (`%`, `_`) → 404.
- `/api/og` público; `/api/google/sync` exige `CRON_SECRET`.

## Não coberto por testes automatizados (só revisão de código)

Login real e permissões por perfil, isolamento entre clientes nas aprovações,
CRUD de clientes/cronogramas/posts, uploads, Kanban/calendário com dados,
aprovação de planejamento. Requer usuários e banco de teste.

---

## Histórico

### 2026-10-15 — Card "Com ajuste solicitado" do dashboard

- Problema: o card conta **posts** com `general_status = em_revisao`, mas linkava para
  `/admin/observacoes`, que lista **comentários** abertos. Resolver a observação não muda o
  status do post (ele só sai de ajuste ao ser reenviado para aprovação), então o card
  mostrava 2 e a página aparecia vazia. Confirmado nos dados (2 posts em revisão, 0 observações abertas).
- Correção (decisão do responsável): o card passa a abrir `/admin/kanban`, coluna "Ajustes".
  Regra de negócio inalterada.
- Checagem: type-check OK, lint 0 erros, build OK, E2E 50/50.

### 2026-10-15 — Revisão completa de QA e segurança

Commits: `0712113`, `4135fbd`. Migração `028_revoke_anonymous_reads.sql` aplicada em produção.

| Gravidade | Problema | Status |
|---|---|---|
| Crítica | Chave anon lia `approval_token`/`access_code` de campanhas, legendas de posts e listava o bucket `campaign-files` | Corrigido (código + migração 028), verificado em produção |
| Alta | `submitApproval` permitia alterar post de outro cliente (post não validado contra o cronograma) | Corrigido (só revisão de código) |
| Alta | Busca de `access_code` com `ilike` aceitava curingas (enumeração) | Corrigido |
| Alta | Login sem JS fazia GET com senha na URL (`action` apontava para rota inexistente) | Corrigido, teste E2E |
| Média | `/recuperar-senha`, `/api/auth/session`, `/api/auth/resend`, `/api/og` bloqueados pelo proxy | Corrigido, teste E2E |
| Média | Post público aprovável com link expirado / cronograma em rascunho | Corrigido |
| Média | `approvePlanning` com duplo clique criava cronograma duplicado | Corrigido (atualização condicional) |
| Média | `identifyPublicVisitor` criava sessão sem token | Corrigido |
| Média | Policies da 006 não restringiam (permissivas = OR) | Corrigido na migração 028 |
| Média | `/api/auth/resend` sem rate limit e com erro cru | Corrigido |
| Baixa | `/auth/confirm` inválido ia para `/definir-senha`; erro de login em inglês; `/cliente/aprovados` mostrava cronogramas ocultos | Corrigido |
| Baixa | CSP bloqueava Google Fonts em produção (fonte Manrope não carregava) | Corrigido, teste E2E em produção |

Resultados finais: type-check OK, lint 0 erros, build OK, E2E 50/50 local e em produção.

Pendências conhecidas (decisão do responsável): token da campanha ativa não regenerado
(válido até 2026-11-11); `approveCampaign` sem checagem de perfil (não usado; RLS protege);
bucket de logos aceita SVG; `.npmrc`/script `dev` desativam verificação SSL.
