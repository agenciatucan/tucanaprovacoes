# Auditoria de produto, fluxos e arquitetura — Portal Tucan

**Início:** 2026-10-15
**Escopo:** coerência do portal como sistema (funcionalidades, fluxos por perfil, regras de negócio e estados, estrutura técnica que os sustenta). Não é uma revisão de bugs isolados — para isso, ver [../qa/README.md](../qa/README.md).
**Regra desta fase:** somente documentação. O código da aplicação não é alterado até aprovação das mudanças propostas.

## Documentos

| Arquivo | Conteúdo |
|---|---|
| [visao-geral.md](visao-geral.md) | Proposta, arquitetura, perfis, funcionalidades e fluxos |
| [diagnostico.md](diagnostico.md) | Achados (AUD-xxx) com evidências, impacto e prioridade |
| [plano-de-acao.md](plano-de-acao.md) | Checklist por prioridade e dependências, com status |
| [validacoes.md](validacoes.md) | O que foi realmente verificado e o que não foi |
| [decisoes-e-duvidas.md](decisoes-e-duvidas.md) | Decisões tomadas e perguntas de negócio pendentes |
| [historico.md](historico.md) | Registro cronológico das etapas |

## Situação atual

**Etapa 1 — Diagnóstico: concluída em 2026-10-15** (base: commit `9a4ae17`).

- **Concluído:** entendimento do portal ([visao-geral.md](visao-geral.md)); 18 achados AUD-001 a AUD-018 (14 confirmados, 3 hipóteses, 1 opcional) ([diagnostico.md](diagnostico.md)); plano priorizado ([plano-de-acao.md](plano-de-acao.md)).
- **Principais quebras:** link público perde pedidos de ajuste (AUD-001); cronograma aprovado fica travado (AUD-002); cronograma concluído some para o cliente (AUD-003); post "em produção" libera aprovação automática (AUD-004).
- **Decisões (2026-10-15):** Q1–Q7 respondidas; AUD-001 descartado (link público mantido, só respeita o bloqueio).

**Etapa 2 — Lote 1 de implementação: código pronto em 2026-10-15** (AUD-002, 003, 004, 006, 007 e o novo AUD-019).

- **Concluído:** alterações de código e migração 029 preparadas; QA (type-check, lint, build, 50 testes E2E) passando. Detalhes em [historico.md](historico.md).
- **Publicado:** commit `a619994` em produção; migração 029 aplicada (2 cronogramas restaurados como "Finalizado"); E2E 50/50 em produção.
- **Pendente:** validar os fluxos logados pelo roteiro em [validacoes.md](validacoes.md). Até lá os itens ficam "implementado — aguarda validação".
- **Próximo passo recomendado:** seguir o roteiro de validação com um cronograma real. Depois, lote 2: AUD-013 → AUD-005 → AUD-008 → AUD-009, e AUD-010.
