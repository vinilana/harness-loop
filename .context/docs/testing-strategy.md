---
type: doc
name: testing-strategy
description: Test frameworks, patterns, coverage requirements, and quality gates
category: testing
generated: 2026-06-26
status: filled
scaffoldVersion: "2.0.0"
---

## Testing Strategy
Ainda não há suíte automatizada de testes no repositório. A validação atual é principalmente manual guiada por fluxo.

## Test Types
- Smoke manual: `npm run dev`, enviar eventos via painel e via `curl` e confirmar atualização no painel.
- Revisão de regra: validar regex `*`, limites de `depth` e filtros `source/event`.
- Regressão manual: garantir que `clearEverything` não quebra estado.

## Running Tests
Não há comando específico de testes.

Recomendado para próximo passo:
- Adicionar testes com Vitest/Jest para `processEvent`, `wildcardMatch`, `template`.

## Quality Gates
- Antes de commit: `npm run build`.
- Conferir manualmente os cenários de loop e emissão sintética.
