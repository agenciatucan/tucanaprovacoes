# Plano de ação

Status: `pendente` · `em andamento` · `bloqueado` (aguarda decisão) · `concluído` (só com correção e verificação registradas em [historico.md](historico.md)).

Nenhum item foi implementado nesta fase: o código da aplicação está inalterado até a aprovação.

## Corrigir agora (P1)

_Revisado em 2026-10-15 após as respostas Q1–Q5 (ver [decisoes-e-duvidas.md](decisoes-e-duvidas.md))._

| ID | Ação | Depende de | Status |
|---|---|---|---|
| AUD-001 | **Decisão: manter o link público como está** (resposta de 2026-10-15). Só passa a respeitar o bloqueio do cronograma (feito em AUD-002). Risco aceito: mensagem de ajuste pelo link continua sem registro visível | — | não será feito (decisão) |
| AUD-004 | **Q3 = sim.** `fn_can_approve_campaign` passa a considerar `em_producao` como bloqueante; o trigger de status deixa de tratar `em_producao` como "já aprovado" | migração 029 | implementado — migração 029 aplicada — aguarda validação logada |
| AUD-002 | **Q4 = não; Q6 = (a).** Bloqueio mantido para o cliente. Link público respeita o bloqueio (servidor e tela). Ações da equipe que devolvem post para aprovação (editar campo aprovado, reenviar) e a volta manual de status para rascunho/enviado/em revisão destravam o cronograma e o levam a `em_revisao` | — | implementado — aguarda validação logada |
| AUD-003 | **Q2 definitiva.** Concluído → `finalizado` (trigger, migração 031); tela inicial e "Aprovados" do cliente listam só cronogramas em andamento (`CLIENT_ACTIVE_CAMPAIGN_STATUSES`); Histórico lista os finalizados; `arquivado` segue oculto | migração 031 | implementado — aguarda aplicar 031 |

## Melhorar em seguida (P2)

| ID | Ação | Depende de | Status |
|---|---|---|---|
| AUD-005 | Aprovação parcial mantém `pendente`; `em_revisao` só para ajuste pedido (ajustar `submitApproval` e `resendForApproval`) | AUD-013 (cálculo único) recomendado antes | pendente |
| AUD-007 | Reenvio reabre cronograma bloqueado e orienta a equipe a avisar o cliente pelo cronograma ("Enviar para aprovação" manda um WhatsApp único, em vez de um por post); `sendCampaignForApproval` confere linhas atualizadas antes de notificar | AUD-002 | implementado — aguarda validação logada |
| AUD-006 | **Q5 = sim.** Alterar tema, legenda ou roteiro de campo já aprovado volta o campo para `aguardando`, recalcula o status do post (`pendente`, ou `em_revisao` se houver ajuste; `em_producao` é mantido), registra no histórico e reabre o cronograma bloqueado (Q6). Post `finalizado` não volta | Q6 | implementado — aguarda validação logada |
| AUD-008 | Dicionário único de rótulos de status usado por dashboard, Kanban, cliente e seletores | AUD-005 | pendente |
| AUD-009 | Pipeline/dashboard não tratam posts de cronograma em rascunho como "Em aprovação" | — | pendente |
| AUD-010 | Exclusões removem objetos do Storage; `approvals` preservado (SET NULL) ou exclusão restrita a arquivar | — | pendente |
| AUD-013 | Módulo de regras de status (visibilidade, rótulos, cálculo) e helper de autorização comum; regenerar `database.types.ts` | — | pendente |
| AUD-016 | Validar e, se confirmado, condicionar aprovação de arte à existência de arquivo visível | validação com a agência | pendente |
| AUD-019 | Registro de histórico do reenvio e da edição gravado com service role (permissão já checada) | — | implementado — aguarda validação logada |

## Opcional / observar (P3)

| ID | Ação | Status |
|---|---|---|
| AUD-011 | Incluir Planejamento (e talvez Atividades) no menu lateral | pendente |
| AUD-012 | Decidir se a data de publicação é parte do fluxo (obrigatória? visível ao cliente?) | pendente |
| AUD-014 | Atualizar README/DESENVOLVIMENTO; remover ou concluir recursos dormentes (Resend, `addInternalComment`, `approveCampaign`, dnd-kit) | pendente |
| AUD-015 | Levantar os perfis `cliente` sem vínculo e definir tratamento | pendente |
| AUD-017 | Avaliar controle de concorrência (ex.: conferir `updated_at` ao salvar) | pendente |
| AUD-018 | Definir papel de Atividades × Minhas tarefas × Eventos | pendente |

## Manter como está

Aprovação por campo; automação planejamento → cronograma; triggers de status como fonte principal (consolidando o código TS em volta deles); checagem de perfil nas Server Actions; lembretes com intervalo mínimo; inativação com corte de acesso; onboarding; stack atual (nenhuma troca justificada).

## Ordem sugerida

1. ~~Responder Q1–Q5~~ (respondidas em 2026-10-15). Responder Q6 e Q7 e autorizar a implementação.
2. ~~AUD-004 → AUD-002 + AUD-007 + AUD-006 → AUD-003~~ (lote 1 implementado em 2026-10-15; AUD-001 descartado por decisão). Pendente: aplicar migração 029 e validar fluxos logados.
3. AUD-013 → AUD-005 → AUD-008 → AUD-009.
4. AUD-010, AUD-006, AUD-016.
5. Itens P3.
