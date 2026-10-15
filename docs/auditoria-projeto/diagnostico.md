# Diagnóstico

Data: 2026-10-15 — base: commit `9a4ae17`.
Método: leitura de código e migrações; contagens somente leitura no banco de produção. **Nenhum fluxo logado foi executado no navegador** (ver [validacoes.md](validacoes.md)).

Prioridade: **P1** corrigir agora · **P2** melhorar em seguida · **P3** opcional/manter observado.

## Diagnóstico geral

O portal tem uma espinha dorsal coerente: a hierarquia cliente → cronograma → post, a aprovação por campo, o registro de aprovações, a automação do planejamento até o cronograma, a checagem de perfil nas Server Actions e as regras de status nos triggers. As quebras de lógica não estão nas peças isoladas, e sim **nas bordas entre elas**:

1. **Dois canais de aprovação com regras diferentes** (login × link público). O link público perde informação.
2. **Fim e reabertura do ciclo do cronograma mal resolvidos.** O bloqueio nunca é desfeito e o cronograma concluído vai para "arquivado", o que o esconde do cliente.
3. **Status sobrecarregados e nomeados de formas diferentes em cada tela** (`em_revisao`, `em_producao`, "pendente"), de modo que dashboard, Kanban e cliente contam histórias diferentes sobre o mesmo post.
4. **Regras duplicadas entre triggers e TypeScript**, a ponto de a interface relatar sucesso que o banco desfaz (caso real corrigido em `9a4ae17`).

## Tabela de achados

| ID | Tipo | Prioridade | Achado | Impacto |
|---|---|---|---|---|
| AUD-001 | Confirmado | P1 | Link público de aprovação descarta a mensagem de ajuste e não avisa a equipe | Pedido do cliente se perde |
| AUD-002 | Confirmado | P1 | `is_locked` nunca é desfeito; cronograma aprovado não aceita nova aprovação do cliente logado | Fluxo de reajuste sem saída |
| AUD-003 | Confirmado | P1 | Cronograma concluído é arquivado e some para o cliente; "Histórico" do cliente fica sempre vazio | Cliente perde acesso ao que aprovou |
| AUD-004 | Confirmado | P1 | Post "Em produção" não segura a aprovação automática do cronograma | Cronograma aprovado/bloqueado sem o cliente aprovar todos os posts |
| AUD-005 | Confirmado | P2 | `em_revisao` significa "ajuste pedido" **e** "aprovado parcialmente" | Contagens e colunas de "Ajustes" enganosas |
| AUD-006 | Confirmado | P2 | Editar conteúdo já aprovado mantém a aprovação | Aprovação passa a valer para um texto que o cliente não viu |
| AUD-007 | Confirmado | P2 | Reenviar post não avisa o cliente nem atualiza o cronograma; "Enviar" retorna sucesso sem mudar nada | Cliente não sabe que há algo para aprovar |
| AUD-008 | Confirmado | P2 | Mesmo status com nomes diferentes em cada tela; cronograma "Em produção" ainda à espera do cliente | Confusão de equipe e cliente |
| AUD-009 | Confirmado | P2 | Kanban e dashboard contam posts de cronogramas em rascunho como "Em aprovação" | Pipeline mostra trabalho que o cliente nem recebeu |
| AUD-010 | Confirmado | P2 | Exclusões deixam arquivos públicos no Storage e apagam a trilha de aprovações | Arte de cliente excluído continua acessível; perda de auditoria |
| AUD-011 | Confirmado | P3 | Planejamento e Atividades fora do menu lateral | Fluxo principal com acesso indireto |
| AUD-012 | Confirmado | P3 | Data de publicação quase não usada; calendário depende dela; cliente nunca vê data | Calendário de posts praticamente vazio |
| AUD-013 | Confirmado (técnico) | P2 | Regras duplicadas: visibilidade, cálculo de status, checagem de perfil, tipos do banco | Mudanças pequenas produzem comportamentos divergentes |
| AUD-014 | Confirmado | P3 | Recursos dormentes ou incompletos (e-mail, comentário interno, `approveCampaign`, dnd-kit, docs desatualizadas) | Expectativa errada; risco se forem religados como estão |
| AUD-015 | Hipótese | P3 | Perfis `cliente` sem vínculo com cliente (7 perfis, 3 vínculos) | Usuários que entram e veem portal vazio |
| AUD-016 | Hipótese | P2 | Cliente pode aprovar a arte antes de ela existir | Aprovação vazia de arte |
| AUD-017 | Hipótese | P3 | Edição simultânea sem controle (última gravação vence) | Aprovação sobre conteúdo alterado |
| AUD-018 | Melhoria opcional | P3 | Três conceitos de tarefa sobrepostos (Atividades, Minhas tarefas, Eventos) | Dúvida sobre onde registrar trabalho |
| AUD-019 | Confirmado (achado na implementação) | P2 | Registro "Ajuste realizado" do reenvio nunca era gravado (bloqueado pelo RLS) | Histórico do post sem a ação da equipe |

---

## Problemas confirmados

### AUD-001 — Link público de aprovação descarta a mensagem de ajuste e não avisa a equipe (P1)
- **O quê:** pelo login, o pedido de ajuste grava `approvals`, cria a observação em `comments_history`, notifica a equipe, move o cronograma para `em_revisao` e manda WhatsApp. Pelo link público (`requestPublicPostAdjustment`), só muda os status do post e tenta gravar a mensagem em `public_approval_events`. **Essa tabela não existe em produção** (verificado) e o erro é engolido. Nenhuma tela lê essa tabela de qualquer forma. A aprovação pública também não grava em `approvals`, não respeita `is_locked` e só permite aprovar o post inteiro.
- **Onde:** [src/actions/public-approvals.ts](../../src/actions/public-approvals.ts) (`savePublicApprovalEvent`, `requestPublicPostAdjustment`), [src/actions/approvals.ts](../../src/actions/approvals.ts) (`submitApproval`), migração 007, `CampaignActions` (botão de copiar link).
- **Exemplo:** o cliente abre o link, escreve "trocar a foto da capa" e envia. O post aparece "em revisão" no Kanban, mas ninguém da equipe recebe aviso e o texto do pedido não existe em lugar nenhum.
- **Recomendação:** depende da pergunta Q1 em [decisoes-e-duvidas.md](decisoes-e-duvidas.md). Mínimo imediato: o ajuste público passa a gravar em `comments_history` (autor = visitante identificado) e a gerar notificação à equipe, reaproveitando a mesma rotina do `submitApproval`. Efeito: aparece em Observações, no histórico do post e no dashboard.

### AUD-002 — `is_locked` nunca é desfeito (P1)
- **O quê:** o trigger 020 aprova o cronograma e marca `is_locked = TRUE` quando nenhum post está pendente ou em revisão. Nenhum código volta para `FALSE`. A partir daí: `submitApproval`/`approveAllPending` recusam ("Este cronograma está bloqueado"), `updateCampaign` recusa edição, e mudar o status manualmente não destrava. O link público ignora o bloqueio, então o mesmo post é aprovável por um canal e não pelo outro.
- **Onde:** migração 020; [approvals.ts:44](../../src/actions/approvals.ts#L44); [campaigns.ts:162](../../src/actions/campaigns.ts#L162); `resendForApproval` em [content-items.ts](../../src/actions/content-items.ts).
- **Exemplo:** o cronograma foi aprovado; uma semana depois o cliente pede outra arte. A equipe ajusta e clica "Reenviar para aprovação". O post volta para "Aguardando aprovação" na tela do cliente, mas ao clicar "Aprovar" ele recebe "Este cronograma está bloqueado".
- **Recomendação:** reenviar um post (ou o admin voltar o status do cronograma) destrava o cronograma e o leva para `em_revisao`. Ver Q4.
- **Revisão após Q4 = "não" (2026-10-15):** o bloqueio é intencional e permanece. O defeito passa a ser a falta de coerência em volta dele: o link público ignora o bloqueio, e o admin ainda pode reenviar ou editar posts de cronograma bloqueado, deixando o post "aguardando" sem que o cliente consiga agir (a tela do cliente já esconde os botões quando bloqueado). A edição pela equipe depende da Q6.

### AUD-003 — Cronograma concluído some para o cliente (P1)
- **O quê:** o trigger 023 muda o cronograma para `arquivado` quando todos os posts estão `finalizado`. `arquivado` é tratado em todo o portal como "oculto do cliente". A página "Histórico" do cliente lista só `finalizado`, status que nenhuma automação aplica. Dados: 0 cronogramas `finalizado` e 2 `arquivado`, ou seja, o Histórico está vazio para todos. A inativação de cliente também arquiva. Desde o commit `0712113` (revisão de QA), "Aprovados" também esconde posts de cronogramas arquivados, alinhado à regra de visibilidade; isso reforça o efeito.
- **Onde:** migração 023; [cliente/historico/page.tsx](../../src/app/(cliente)/cliente/historico/page.tsx) (`.eq('status','finalizado')`); [src/lib/constants/status.ts](../../src/lib/constants/status.ts).
- **Exemplo:** o cliente quer rever a legenda aprovada no mês passado. O cronograma não aparece em lugar nenhum da área dele.
- **Recomendação:** o trigger passa a marcar `finalizado`, e `arquivado` fica para ocultação manual. Migração de dados para os 2 cronogramas arquivados automaticamente, se confirmado. Ver Q2.

### AUD-004 — Post "Em produção" não segura a aprovação automática (P1)
- **O quê:** `em_producao` do post é usado como "equipe trabalhando antes da aprovação" (botão "Marcar em produção" só a partir de `pendente`). Mas `fn_can_approve_campaign` (022) só considera bloqueantes `pendente` e `em_revisao`, e o trigger de status trata `em_producao` como etapa posterior à aprovação.
- **Onde:** migrações 001/010/022; [PostProductionToggle.tsx](../../src/components/admin/PostProductionToggle.tsx); [kanban/page.tsx](../../src/app/(admin)/admin/kanban/page.tsx) (comentário do mapeamento).
- **Exemplo:** um cronograma com 10 posts tem 8 aprovados e 2 marcados "em produção" (arte ainda sendo feita). O cronograma vira "Aprovado" e é bloqueado (AUD-002) sem o cliente ter visto esses 2 posts.
- **Recomendação:** incluir `em_producao` entre os status que impedem a aprovação automática (e decidir o significado único do status; Q3).

### AUD-005 — `em_revisao` com dois significados (P2)
- **O quê:** `submitApproval` define `em_revisao` quando há ajuste **ou** quando só parte dos campos foi aprovada ("em progresso"). `resendForApproval` faz o mesmo. O dashboard ("Com ajuste solicitado"), o Kanban (coluna "Ajustes") e a área do cliente tratam `em_revisao` como "cliente pediu ajuste".
- **Onde:** [approvals.ts](../../src/actions/approvals.ts) (cálculo de `newGeneralStatus`), `resendForApproval`, [admin/page.tsx](../../src/app/(admin)/admin/page.tsx), Kanban.
- **Exemplo:** o cliente aprova tema e legenda e deixa a arte para depois. O post vai para "Ajustes" no Kanban e conta como "Com ajuste solicitado", mas a equipe não tem nada a fazer.
- **Recomendação:** aprovação parcial mantém `pendente` (aguardando o cliente) e `em_revisao` fica só para ajuste pedido. Os triggers já cobrem o caso de ajuste.

### AUD-006 — Editar conteúdo aprovado mantém a aprovação (P2)
- **O quê:** `updateContentItem` não mexe nos status nem registra histórico. A legenda aprovada pode ser reescrita e continuar "aprovada".
- **Onde:** [content-items.ts](../../src/actions/content-items.ts) (`updateContentItem`), PostForm.
- **Exemplo:** a equipe corrige um preço na legenda já aprovada. O cliente nunca vê a versão nova, e o registro diz que ele aprovou.
- **Recomendação:** ver Q5. Opções: voltar o campo editado para `aguardando`, ou ao menos registrar a edição no histórico e avisar.

### AUD-007 — Reenvio não chega ao cliente (P2)
- **O quê:** `resendForApproval` não notifica o cliente e não muda o status do cronograma. O botão "Enviar para aprovação" só existe para `rascunho`/`em_revisao`, então em cronogramas vindos do planejamento (`em_producao`) o único aviso possível é o lembrete manual. `sendCampaignForApproval` retorna sucesso e manda WhatsApp mesmo quando o filtro de status não atualiza nenhuma linha (por exemplo, tela desatualizada).
- **Onde:** `resendForApproval`, [campaigns.ts](../../src/actions/campaigns.ts) (`sendCampaignForApproval`), [CampaignActions.tsx](../../src/components/admin/CampaignActions.tsx) (`canSend`).
- **Recomendação:** reenvio leva o cronograma a `em_revisao` (ligado a AUD-002) e habilita "Enviar para aprovação"/aviso ao cliente; `sendCampaignForApproval` confere as linhas afetadas.

### AUD-008 — Nomes de status divergentes (P2)
- **O quê:** o post `pendente` aparece como "Em produção" (funil do dashboard), "Posts pendentes — para produzir" (cartão do dashboard), "Em aprovação" (Kanban) e "Aguardando aprovação" (cliente e seletor). O cartão "Aguardando aprovação" do dashboard conta só **planejamentos**. O cronograma vindo do planejamento é mostrado ao cliente como "Em produção" enquanto ele ainda precisa aprovar legenda e arte.
- **Onde:** [admin/page.tsx](../../src/app/(admin)/admin/page.tsx) (`funnelSegments`, `kpis`), Kanban, [constants/status.ts](../../src/lib/constants/status.ts), [PostGeneralStatusSelect.tsx](../../src/components/admin/PostGeneralStatusSelect.tsx).
- **Recomendação:** um único dicionário de rótulos (já existe embrião em `constants/status.ts`) usado por todas as telas.

### AUD-009 — Pipeline inclui cronogramas em rascunho (P2)
- **O quê:** Kanban e contagens do dashboard excluem só `arquivado`/`finalizado`. Posts de cronograma em `rascunho` aparecem como "Em aprovação".
- **Onde:** [kanban/page.tsx](../../src/app/(admin)/admin/kanban/page.tsx) (filtro de campanhas), [admin/page.tsx](../../src/app/(admin)/admin/page.tsx) (`activeCampaignIds`).
- **Recomendação:** mapear posts de cronograma em rascunho para "Em produção"/"Entrada" ou filtrá-los.

### AUD-010 — Exclusões deixam arquivos e apagam auditoria (P2)
- **O quê:** `deleteClient`, `deleteCampaign` e `deleteContentItem` apagam linhas; `files` cai em cascata, mas os objetos no bucket **público** continuam acessíveis pela URL. `approvals` é descrito como "imutável — NUNCA deletar", mas tem `ON DELETE CASCADE` em cliente e cronograma.
- **Onde:** [clients.ts](../../src/actions/clients.ts), [campaigns.ts](../../src/actions/campaigns.ts), [content-items.ts](../../src/actions/content-items.ts), migração 001.
- **Recomendação:** remover os objetos do Storage antes de apagar e preferir arquivar a excluir (ou manter `approvals` com `SET NULL`).

### AUD-011 — Navegação (P3)
- Menu lateral: Dashboard, Clientes, Cronogramas, Pipeline, Calendário, Minhas tarefas, Observações, Config. **Planejamento** (origem de todos os cronogramas ativos) só é alcançável pelo dashboard, pela ficha do cliente ou pela lista de cronogramas. **Atividades** só pelo Pipeline. Arquivo: [AdminSidebar.tsx](../../src/components/layout/AdminSidebar.tsx).

### AUD-012 — Data de publicação (P3)
- `scheduled_date` é opcional e está preenchida em 1 de 49 posts. O calendário de posts depende dela. O cliente nunca vê data (nenhuma página do cliente busca o campo). A página pública do post tenta mostrar a data, mas a action não seleciona a coluna. Organização real por `week_label`.

### AUD-013 — Regras duplicadas (P2, técnico)
- Lista de status visíveis ao cliente em `constants/status.ts`, `public-access.ts` (cópia própria), SQL da 028 e listas de planejamento nas páginas.
- Cálculo de `general_status` em três lugares com regras diferentes: trigger (aceita arte `nao_se_aplica`), `submitApproval` e `resendForApproval` (exigem `aprovado`). Funciona porque o trigger sobrescreve depois; foi a causa do bug corrigido em `9a4ae17`.
- `requireStaff`/`requireAdmin` copiados em cerca de 12 arquivos; `src/lib/auth/require-admin.ts` existe, mas com semântica de redirect.
- `src/types/database.types.ts` desatualizado (não tem `access_code`, por exemplo).
- **Recomendação:** um módulo de regras de status (rótulos, visibilidade, transições) e um helper de autorização comum. Sem reescrever o sistema.

### AUD-014 — Recursos dormentes ou incompletos (P3)
- **E-mail (Resend):** dependência e variáveis configuradas, nenhum uso no código. README e DESENVOLVIMENTO prometem e-mails.
- **`addInternalComment`:** não usado. Se for ligado como está, grava comentário "interno" visível ao cliente e contado como observação aberta.
- **`approveCampaign`:** não usado e sem checagem de perfil (o RLS protege).
- **`@dnd-kit`:** instalado, mas o Kanban não tem arrastar.
- **Docs:** DESENVOLVIMENTO.md cita Next 15, fases 8/9 pendentes (uploads já existem) e `src/lib/email/` (não existe). O README diz que o cliente recebe link único, mas o WhatsApp manda para o login.

### AUD-019 — Registro "Ajuste realizado" do reenvio não era gravado (P2, encontrado na implementação em 2026-10-15)
- **O quê:** `resendForApproval` inseria em `comments_history` com o cliente Supabase da sessão. A policy de INSERT (002) exige `has_client_access(client_id)`, que admin/equipe não têm, e o erro era só registrado em log. `addInternalComment` já contornava isso com service role, e o comentário dele documenta o motivo.
- **Evidência:** as 4 linhas de `comments_history` em produção são de clientes; nenhum registro "Ajuste realizado" existe, embora observações tenham sido resolvidas.
- **Onde:** [content-items.ts](../../src/actions/content-items.ts) (`resendForApproval`).
- **Correção:** ver [historico.md](historico.md) (lote 1 de implementação).

## Hipóteses (precisam de validação)

### AUD-015 — Perfis `cliente` sem vínculo
- 7 perfis `cliente` e 3 vínculos em `client_users`. `removeMember` ([team.ts](../../src/actions/team.ts)) transforma membro removido em `cliente`; convites podem criar perfil antes do vínculo. Validar quem são esses perfis e o que veem ao entrar (provavelmente o portal vazio).

### AUD-016 — Aprovar arte inexistente
- Posts vindos do planejamento nascem com arte `aguardando`, e o painel do cliente oferece "Aprovar" para arte e "Aprovar post completo" sem checar se há arquivo. Validar se isso acontece na prática e se deve ser bloqueado.

### AUD-017 — Edição simultânea
- Não há controle de versão: duas pessoas editando o mesmo post sobrescrevem uma à outra; o cliente pode aprovar enquanto a equipe edita. Relacionado a AUD-006.

## Melhorias opcionais

### AUD-018 — Conceitos de tarefa sobrepostos
- Atividades (Kanban; 7 registros), Minhas tarefas (88) e Eventos internos/Google (1.889; nenhuma conexão Google ativa hoje). Vale definir o papel de cada um antes de evoluir qualquer deles.

## O que está bem resolvido e deve ser preservado

- Aprovação por campo (tema/legenda/arte) com observação e snapshot dos status no comentário.
- Automação planejamento → cronograma → posts com tema já aprovado.
- Checagem de perfil no servidor em todas as Server Actions de mutação; acesso público escopado pelo token (reforçado em `0712113`).
- Lembretes com intervalo mínimo de 4h, registrados só quando o WhatsApp sai de fato; notificações com `after()`.
- Inativação de cliente que corta o acesso via `has_client_access`.
- Painel de reenvio que resolve observações e registra "ajuste realizado" no histórico.
- Checklist de onboarding com modelo editável.
