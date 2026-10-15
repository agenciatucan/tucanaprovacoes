# Visão geral do Portal Tucan

Legenda: **[doc]** = está na documentação (README.md, docs/DESENVOLVIMENTO.md, comentários das migrações); **[código]** = inferido do código e/ou dos dados (contagens somente leitura em 2026-10-15).

## 1. Proposta

- **[doc]** Portal para a Agência Tucan gerir e aprovar cronogramas de conteúdo com os clientes, "sem PDF, sem planilha, sem WhatsApp": a agência cria os posts, o cliente aprova tema, legenda e arte.
- **[código]** Na prática o portal virou também a ferramenta interna da agência: Kanban ("Pipeline") de posts e atividades, calendário com sincronização do Google Agenda, tarefas pessoais ("Minhas tarefas"), checklist de onboarding de clientes, lembretes por WhatsApp (Evolution API) e um fluxo de **planejamento** (aprovação de temas) que antecede o cronograma.

## 2. Arquitetura

- **[doc]** Next.js App Router (hoje 16.x; a doc ainda diz 15), TypeScript, Tailwind, Supabase (Postgres + Auth + Storage), Zod, Vercel.
- **[código]** Mutações em Server Actions (`src/actions/*`), cada uma com sua própria checagem de perfil. Leituras em Server Components com o cliente Supabase da sessão (RLS) e, nos fluxos públicos e em operações do cliente que o RLS não permite, com service role escopado manualmente.
- **[código]** Parte relevante das regras de negócio vive no banco, em triggers:
  - `fn_auto_update_post_status` (001/010): recalcula `general_status` do post a partir de tema/legenda/arte.
  - `fn_auto_approve_campaign` (020/022): aprova e **bloqueia** (`is_locked`) o cronograma quando nenhum post está `pendente`/`em_revisao`.
  - `fn_auto_archive_campaign` (023): **arquiva** o cronograma quando todos os posts estão `finalizado`.
  - `inactivate_client` (003): inativar cliente arquiva seus cronogramas; `has_client_access` (005) corta o acesso do cliente inativo.
- **[código]** Notificações: WhatsApp via Evolution API (`src/lib/whatsapp-notifications.ts`), sininho interno para a equipe (`notifications`). E-mail (Resend) **não está implementado** apesar de constar na doc.

## 3. Perfis

| Perfil | Responsabilidade | Acesso | Fonte |
|---|---|---|---|
| `admin` | Gestão total; configurações, equipe, onboarding; arquivar/excluir cronogramas; mudar status manualmente | `/admin/*` | [doc] + [código] |
| `equipe` | Produção: clientes, cronogramas, posts, uploads, planejamento, Kanban | `/admin/*` exceto Config. | [doc] + [código]. Hoje há 0 usuários `equipe` (3 admins) |
| `cliente` (logado) | Ver cronogramas visíveis do(s) seu(s) cliente(s), aprovar/pedir ajuste por campo, aprovar tudo, ver aprovados e histórico | `/cliente/*` | [doc] + [código] |
| Visitante com link | Identifica-se só com nome; vê o cronograma e aprova/pede ajuste do post inteiro | `/acesso/[token]` | [doc] + [código] |
| Visitante com link de planejamento | Aprova temas ou pede ajuste | `/acesso/planejamento/[token]` | [código] |

## 4. Entidades e estados

```
clients (ativo | inativo)
 ├─ client_users ── user_profiles (admin | equipe | cliente)
 ├─ planning_schedules (rascunho → enviado_para_aprovacao ⇄ em_revisao → aprovado | arquivado)
 │    └─ planning_items  ──(aprovação cria)──▶ campaign + content_items
 ├─ campaigns (rascunho → enviado_para_aprovacao ⇄ em_revisao → aprovado → em_producao → finalizado | arquivado)
 │    ├─ is_locked (vira TRUE na aprovação automática; nunca volta a FALSE no código)
 │    └─ content_items
 │         ├─ theme/caption/artwork_status: aguardando | aprovado | ajuste_solicitado | substituir_tema | nao_se_aplica
 │         ├─ general_status: pendente | em_producao | em_revisao | aprovado | programado | finalizado
 │         ├─ approvals (registro "imutável", mas apagado em cascata)
 │         ├─ comments_history (aberta | resolvida)
 │         └─ files (bucket público campaign-files; visible_to_client)
 ├─ activities (Kanban interno), client_onboarding_items, client_reminders
 └─ internal_events (calendário/Google), personal_tasks (por usuário)
```

**[código]** Transições de post na prática:

| De → Para | Quem/como |
|---|---|
| (novo) → `pendente` | equipe cria post, ou aprovação de planejamento cria posts com tema já aprovado |
| `pendente` ⇄ `em_producao` | equipe, botão "Marcar em produção" (antes da aprovação do cliente) |
| `pendente` → `em_revisao` | cliente aprova só parte dos campos **ou** pede ajuste (mesmo status para os dois casos) |
| → `aprovado` | trigger, quando tema+legenda+arte aprovados; ou "aprovar post completo"; ou link público |
| `em_revisao` → `pendente`/`em_revisao` | equipe "Reenviar para aprovação" (campos com ajuste voltam a `aguardando`) |
| `aprovado` → `programado` → `finalizado` | equipe (botões no post/Kanban) |
| qualquer → qualquer | admin/equipe pelo seletor manual de status geral |

## 5. Fluxos principais

1. **Planejamento → cronograma (fluxo em uso hoje).** Equipe cria planejamento com temas → envia (WhatsApp com link `/acesso/planejamento/TOKEN`) → cliente aprova ou pede ajuste → ao aprovar, o sistema cria um cronograma em `em_producao` com os posts `pendente` (tema aprovado, legenda/arte aguardando). Dados: 3 planejamentos aprovados, todos com cronograma; os 2 cronogramas ativos vieram daí.
2. **Cronograma clássico.** Equipe cria cronograma em `rascunho` → adiciona posts → "Enviar para aprovação" (WhatsApp com link para `/cliente/cronogramas/ID`, que exige login) → cliente aprova por campo ou pede ajuste → equipe reenvia posts ajustados → aprovação automática do cronograma → produção/programação/publicação → arquivamento automático. Dados: nenhum cronograma em `rascunho`/`enviado` hoje.
3. **Aprovação por link público.** Admin copia o link `/acesso/TOKEN` na tela do cronograma e envia por fora; visitante informa o nome e aprova/pede ajuste do post inteiro.
4. **Operação interna.** Pipeline (posts + atividades), calendário (posts com data, início de cronogramas, eventos internos/Google), Minhas tarefas, Observações (comentários abertos), dashboard com KPIs, onboarding de clientes, lembretes por WhatsApp com intervalo mínimo de 4h.
