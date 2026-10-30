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

### 2026-10-30 — Site lento para carregar

- Causa: cada navegação logada fazia ~8 idas e voltas ao Supabase **em série** antes de buscar os dados da tela: proxy (`getUser` + papel), layout (`getUser` + perfil + `getUser` de novo em `getUnreadCount`) e página (`getUser` + perfil). Não havia `loading.tsx`, então o clique parecia travado até o servidor terminar.
- Correção: proxy usa `getClaims()` (JWT ES256 validado localmente, sem chamar o servidor de Auth) e só consulta o papel em `/admin` e `/cliente`; novo `src/lib/auth/current-user.ts` (`getAuthUserId`/`getCurrentProfile` com React `cache()`) compartilhado por layouts, páginas e `getUnreadCount` — 1 consulta de perfil por request; esqueleto de carregamento em `(admin)` e `(cliente)`. Server Actions e `requireAdmin` continuam com `getUser()`.
- Checagem: type-check OK, lint 0 erros, build OK, E2E 50/50 (localhost). Fluxo logado não testado automaticamente (testes não fazem login).

### 2026-10-15 — Posts do planejamento entram em produção

- Posts criados pelo planejamento entram "Em produção" e saem para "Aguardando aprovação" com legenda + arquivo visível; rótulos da tela do cronograma unificados. Migração opcional 032.
- Checagem: type-check OK, lint 0 erros, build OK, E2E 50/50 (localhost). Fluxo logado não testado.

### 2026-10-15 — Lote 2 da auditoria (AUD-005, 008, 009, 010, 013)

- Status do post com cálculo único (aprovação parcial = aguardando aprovação), rótulos únicos no dashboard/seletor, rascunhos fora de "aguardando aprovação", limpeza do Storage ao excluir.
- Checagem: type-check OK, lint 0 erros (77 warnings), build OK, E2E 50/50 (localhost). Fluxos logados e exclusões não testados.

### 2026-10-15 — Lote 1 da auditoria de produto (ver docs/auditoria-projeto)

- Mudanças: AUD-002/003/004/006/007/019 (bloqueio e reabertura de cronograma, edição de conteúdo aprovado volta para aprovação, cronograma concluído vira "Finalizado", post em produção segura aprovação automática, histórico de reenvio gravado). Migração 029.
- Checagem: type-check OK, lint 0 erros, build OK, E2E 50/50 (localhost). Fluxos logados não testados (sem usuários de teste); roteiro manual em `docs/auditoria-projeto/validacoes.md`.

### 2026-10-15 — Mudança manual de status do post não era gravada

- Problema: ao mudar o status geral para "Concluído" (cliente aprovou fora do portal), a tela
  mostrava "Status geral atualizado", mas o banco mantinha `em_revisao`. Causa: o trigger
  `fn_auto_update_post_status` (migração 010) força `em_revisao` enquanto tema/legenda/arte
  estiverem com `ajuste_solicitado`, e `updateContentItemStatus` não conferia o valor gravado.
  Confirmado nos dados: 2 posts com `general_status = em_revisao`, última atualização 08/10.
- Correção: ao avançar manualmente para aprovado/em produção/programado/concluído, os campos com
  ajuste pendente passam a `aprovado`; a action confere o valor salvo e retorna erro se o banco
  não aceitou. `PostProductionToggle` passa a exibir o erro.
- Checagem: type-check OK, lint 0 erros, build OK, E2E 50/50. Fluxo logado verificado só pelo
  código (testes não fazem login).

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
