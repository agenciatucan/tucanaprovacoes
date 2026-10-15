# Validações

## Executado nesta auditoria (2026-10-15)

| Verificação | Como | Resultado |
|---|---|---|
| Leitura das migrações 001–028 (enums, triggers, RLS) | Código | Base para AUD-002/003/004/010/013 |
| Rastreamento dos fluxos de aprovação (login e link público), reenvio, edição, exclusão, envio de cronograma | Código: actions, páginas e componentes | Base para AUD-001/002/005/006/007/010 |
| Mapeamento de rótulos e filtros em dashboard, Kanban, calendário, área do cliente | Código | AUD-008/009/012 |
| Navegação (menu admin e cliente) | Código | AUD-011 |
| Existência da tabela `public_approval_events` em produção | Consulta somente leitura (service role) | **Não existe** → AUD-001 |
| Distribuição de status e uso dos recursos | Contagens somente leitura, sem conteúdo | Cronogramas: 2 `arquivado`, 2 `em_producao`. Posts: 21 `pendente`, 28 `finalizado`. 1/49 com `scheduled_date`. 3 admins, 0 equipe, 7 clientes (3 vínculos). 4 planejamentos (3 aprovados). Atividades 7, Minhas tarefas 88, Eventos 1.889, conexões Google 0 |
| Uso de e-mail (Resend) | Busca no código | Nenhum uso → AUD-014 |

Validações anteriores no mesmo dia (QA e segurança, fluxos públicos e redirecionamentos testados no navegador com Playwright): ver [../qa/README.md](../qa/README.md).

## Não verificado na prática

- **Nenhum fluxo logado foi executado** (admin, equipe ou cliente): não há usuários de teste nem banco de teste, e gravar em produção não é permitido.
- Os cenários de AUD-002, AUD-004, AUD-005, AUD-006 e AUD-007 foram deduzidos do código e dos triggers, não reproduzidos.
- Policies RLS reais do banco: só as do repositório foram lidas (a 028 removeu as anônimas desconhecidas). Não é possível listar `pg_policies` pela API.
- Comportamento visual e responsivo das telas logadas.
- Sincronização com o Google Agenda (nenhuma conexão ativa).

## Para validar as hipóteses

- AUD-015: listar os perfis `cliente` sem vínculo (consulta somente leitura) e confirmar com a agência quem são.
- AUD-016: abrir um post vindo de planejamento como cliente de teste e verificar se aparecem "Aprovar arte" e "Aprovar post completo" sem arquivo.
- AUD-017: duas sessões editando o mesmo post em ambiente de teste.

## Lote 1 de implementação (2026-10-15)

| Verificação | Resultado |
|---|---|
| `npm run type-check` | OK |
| `npm run lint` | 0 erros, 77 warnings (mesmo número de antes) |
| `npm run build` | OK |
| `npm run test:e2e` (50 testes, desktop + celular, localhost) | 50/50 |
| Critério de dados da migração 029 (somente leitura) | 2 cronogramas arquivados atendem: cliente ativo, sem inativação, 12 e 10 posts todos finalizados |
| Autores de `comments_history` (somente leitura) | 4 linhas, todas de clientes; nenhum registro de reenvio → evidência do AUD-019 |

**Não verificado:** fluxos logados afetados (editar post aprovado, reenviar, voltar status manual, aprovar em cronograma bloqueado pelo login e pelo link, aprovação automática com post em produção). Roteiro sugerido para validar após o deploy e a migração 029, com um cronograma real ou de teste:
1. Editar a legenda de um post aprovado → aparece "voltou para aprovação"; no cliente, legenda volta a "aguardando"; histórico do post mostra o registro.
2. Em cronograma aprovado (bloqueado), editar um campo aprovado → cronograma passa a "Em revisão" e o botão "Enviar para aprovação" aparece.
3. Link público de cronograma bloqueado → painel mostra "Este cronograma já foi aprovado".
4. Marcar um post "Em produção" e aprovar todos os outros → cronograma **não** é aprovado automaticamente.
5. ~~Concluir o último post → "Finalizado" no Histórico~~ (revisto): após a migração 030, concluir o último post → cronograma "Arquivado" e oculto do cliente.
