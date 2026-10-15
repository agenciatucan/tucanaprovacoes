# Decisões e dúvidas

## Decisões tomadas

| Data | Decisão | Justificativa |
|---|---|---|
| 2026-10-15 | Auditoria somente documental; código inalterado até aprovação | Pedido do responsável |
| 2026-10-15 | Verificações no banco apenas por contagem, somente leitura | `.env.local` aponta para produção; não há banco de teste |
| 2026-10-15 | Não propor troca de stack nem reescrita | Problemas são de regra/fluxo, resolvíveis de forma incremental |
| 2026-10-15 | **Q1:** login e link público continuam, com as mesmas regras | Resposta do responsável |
| 2026-10-15 | **Q2:** cronograma com todos os posts publicados continua visível ao cliente ("acredito que sim") | Resposta do responsável. Implica `finalizado` em vez de `arquivado` automático |
| 2026-10-15 | **Q3:** "Em produção" no post = equipe produzindo **antes** da aprovação; deve segurar a aprovação do cronograma | Resposta do responsável |
| 2026-10-15 | **Q4:** depois de aprovado o cronograma, o cliente **não** pode pedir novos ajustes | Resposta do responsável. O bloqueio (`is_locked`) é intencional; deve valer igual no link público |
| 2026-10-15 | **Q5:** editar conteúdo já aprovado faz o campo voltar para aprovação | Resposta do responsável |
| 2026-10-15 | **Link público (AUD-001): manter como está.** Não unificar com o login. Única mudança aceita: respeitar o bloqueio do cronograma (parte do AUD-002) | Resposta do responsável. Risco aceito: mensagem de ajuste pelo link continua sem registro visível |
| 2026-10-15 | **Q6 = (a):** edição feita pela equipe reabre o post e o cronograma volta para "em revisão"; o cliente não reabre | Resposta do responsável |
| 2026-10-15 | **Q7 = sim:** os 2 cronogramas arquivados automaticamente voltam como "Finalizado" | Resposta do responsável |
| 2026-10-15 | Implementação autorizada: AUD-002, 003, 004, 006, 007 | Resposta do responsável ("ok") |

## Perguntas de negócio pendentes

**Q6 — Conflito entre Q4 e Q5: a equipe edita um post de um cronograma já aprovado (bloqueado). E agora?**
Pela Q5 o campo volta para aprovação; pela Q4 o cliente não pode mais agir num cronograma aprovado. Sem decidir, o post fica "aguardando" para sempre.
- (a) A edição feita pela equipe reabre aquele post e o cronograma volta para "em revisão" (a equipe pode reabrir; o cliente não). **Recomendado.**
- (b) Conteúdo de cronograma aprovado não pode ser editado (só o admin, após voltar o status manualmente).
- (c) Correções pequenas depois da aprovação não voltam para o cliente: Q5 vale só antes da aprovação do cronograma.

**Q7 — Os 2 cronogramas arquivados automaticamente devem voltar a aparecer para o cliente como "Finalizado"?** (AUD-003)
Exige uma migração de dados que você rodaria no Supabase.

## Perguntas respondidas (Q1–Q5)

Mantidas abaixo como registro. Respostas na tabela de decisões.

**Q1 — Qual é o canal oficial de aprovação do cronograma?** (AUD-001, AUD-002)
O WhatsApp manda o cliente para o login (`/cliente`), mas o admin também pode copiar um link público (`/acesso/TOKEN`) que funciona sem login, só com o nome.
- (a) Os dois continuam, com as mesmas regras e o mesmo registro (recomendado se o link é usado com clientes que não têm login).
- (b) Só login para cronogramas; o link público fica apenas para planejamento.

**Q2 — Quando todos os posts são publicados, o cronograma deve continuar visível para o cliente?** (AUD-003)
Hoje ele é arquivado automaticamente e some. Recomendação: marcar como "Finalizado" (visível no Histórico) e reservar "Arquivado" para ocultação manual.

**Q3 — O que significa "Em produção" em um post?** (AUD-004, AUD-008)
O botão usa como "equipe ainda produzindo, antes de o cliente aprovar"; o banco trata como "já passou da aprovação". Se for o primeiro, esses posts devem impedir a aprovação automática do cronograma?

**Q4 — Depois que o cronograma é aprovado, o cliente pode pedir novos ajustes?** (AUD-002, AUD-007)
Se sim, reenviar um post deve reabrir o cronograma (destravar e voltar para "em revisão"). Se não, o reenvio deveria ser bloqueado para cronogramas aprovados.

**Q5 — Se a equipe edita um conteúdo já aprovado, ele volta para aprovação do cliente?** (AUD-006)
- (a) Sim, o campo editado volta para "aguardando".
- (b) Não, mas a edição fica registrada no histórico e o cliente é avisado.
- (c) Não, mantém como está.
