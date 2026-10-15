# Histórico da auditoria

Registro cronológico. Não apagar entradas anteriores; correções futuras devem citar o identificador AUD-xxx e a verificação feita.

## 2026-10-15

- Criada a pasta `docs/auditoria-projeto/`. Estado do repositório no início: commit `9a4ae17` (main).
- Contexto anterior no mesmo dia: revisão de QA/segurança registrada em [../qa/README.md](../qa/README.md) (commits `0712113`, `4135fbd`, `01fa670`, `9a4ae17`, migração 028 aplicada).
- Etapa 1 iniciada: leitura de README, docs/DESENVOLVIMENTO.md, migrações e código dos fluxos principais.
- Rastreados os fluxos de aprovação (login e link público), reenvio, edição, exclusão, envio e arquivamento de cronograma; dashboard, Kanban, calendário e área do cliente.
- Contagens somente leitura no banco: confirmada a inexistência de `public_approval_events` (AUD-001) e a ausência de cronogramas `finalizado` (AUD-003).
- Registrados AUD-001 a AUD-018 em diagnostico.md, plano em plano-de-acao.md e perguntas Q1–Q5 em decisoes-e-duvidas.md.
- Etapa 1 concluída. Código da aplicação inalterado. Aguardando respostas e autorização para implementação.
- Respostas recebidas: Q1 os dois canais com a mesma regra; Q2 sim (provável); Q3 sim; Q4 não; Q5 sim. Registradas em decisoes-e-duvidas.md.
- Verificado no código: ApprovalPanel do cliente já esconde ações quando o cronograma está bloqueado; a página do post no admin mantém edição e "Reenviar para aprovação" disponíveis mesmo com o cronograma bloqueado.
- Plano revisado (AUD-001, 002, 003, 004, 006, 007). Abertas Q6 (edição pela equipe em cronograma aprovado, conflito entre Q4 e Q5) e Q7 (restaurar os 2 cronogramas arquivados automaticamente). Código ainda inalterado.
- Respostas finais: link público mantido como está (AUD-001 descartado, exceto respeitar o bloqueio); itens 2–5 aprovados; Q6 = (a); Q7 = sim. Implementação autorizada.

### Lote 1 de implementação (2026-10-15)

| ID | Alteração | Arquivos |
|---|---|---|
| AUD-003 | Trigger de conclusão marca `finalizado` em vez de `arquivado`; dados: cronogramas arquivados automaticamente (todos os posts finalizados, sem inativação, cliente ativo) voltam a `finalizado`. Conferido somente leitura: 2 cronogramas atendem ao critério | `supabase/migrations/029_finalize_instead_of_archive_and_em_producao_blocks.sql` |
| AUD-004 | `fn_can_approve_campaign` bloqueia com `em_producao`; `fn_auto_update_post_status` deixa de tratar `em_producao` como pós-aprovação | migração 029 |
| AUD-002 | Link público recusa aprovar/ajustar cronograma bloqueado e a tela mostra aviso no lugar dos botões; reabertura do cronograma (`is_locked=false`, `em_revisao`) quando a equipe devolve post para aprovação; volta manual de status para rascunho/enviado/em revisão destrava | `src/actions/public-approvals.ts`, `src/components/aprovacao/PublicApprovalPanel.tsx`, `src/app/(public)/acesso/[token]/posts/[postId]/page.tsx`, `src/actions/content-items.ts` (`reopenApprovedCampaign`), `src/actions/campaigns.ts` (`updateCampaignStatus`) |
| AUD-006 | `updateContentItem`: alterar tema/legenda/roteiro já aprovado volta o campo para `aguardando`, recalcula o status geral, registra no histórico e reabre o cronograma; mensagem específica no formulário | `src/actions/content-items.ts`, `src/components/admin/PostForm.tsx` |
| AUD-007 | `resendForApproval` reabre cronograma bloqueado e a mensagem orienta a avisar o cliente pelo cronograma; `sendCampaignForApproval` só notifica se o status realmente mudou | `src/actions/content-items.ts`, `src/components/admin/ResendApprovalPanel.tsx`, `src/actions/campaigns.ts` |
| AUD-019 | Registros de histórico da equipe (reenvio e edição) gravados com service role | `src/actions/content-items.ts` |

Verificação: type-check OK; lint 0 erros (77 warnings preexistentes); `next build` OK; Playwright 50/50 (desktop + celular) contra localhost. Fluxos logados **não** executados (sem usuários/banco de teste) — itens ficam como "implementado — aguarda validação", não "concluído". Migração 029 preparada, **não aplicada**.
- Publicado: commit `a619994` (main), deploy na Vercel; Playwright 50/50 contra produção.
- Migração 029 aplicada pelo responsável. Verificado somente leitura: os 2 cronogramas antes `arquivado` agora estão `finalizado` (status atuais: 2 `em_producao`, 2 `finalizado`). Fluxos logados ainda pendentes de validação (roteiro em validacoes.md).
- Decisão revista pelo responsável: cronogramas concluídos devem ficar ocultos do cliente. Preparada a migração `030_archive_finished_campaigns_again.sql` (trigger volta a arquivar; os 2 cronogramas restaurados voltam a `arquivado`). AUD-004 (parte 2/3 da 029) permanece. Nenhuma alteração de código da aplicação. 030 ainda não aplicada.
- Migração 030 aplicada pelo responsável. Verificado somente leitura: os 2 cronogramas concluídos voltaram a `arquivado` (ocultos do cliente); ativos seguem `em_producao`.
- Decisão definitiva (Q2): concluídos saem das telas principais do cliente e aparecem no Histórico. Implementado: constante `CLIENT_ACTIVE_CAMPAIGN_STATUSES` (sem `finalizado`) usada na tela inicial e em "Aprovados" do cliente (`src/lib/constants/status.ts`, `src/app/(cliente)/cliente/page.tsx`, `src/app/(cliente)/cliente/aprovados/page.tsx`); migração `031_finished_campaigns_in_client_history.sql` (trigger marca `finalizado`; os 2 concluídos viram `finalizado`). QA: type-check OK, lint 0 erros, build OK, E2E 50/50. 031 ainda não aplicada.
- Migração 031 aplicada pelo responsável e publicada (commit `bcfe881`, E2E 50/50 em produção). Verificado somente leitura: os 2 concluídos estão `finalizado`.
- Responsável notou que a aba "Ativos" de `/admin/cronogramas` listava os concluídos. Causa: filtro e contador excluíam só `arquivado`. Corrigido para excluir `arquivado` e `finalizado` (os concluídos têm aba própria) em `src/app/(admin)/admin/cronogramas/page.tsx`. QA: type-check OK, lint 0 erros, build OK, E2E 50/50.
