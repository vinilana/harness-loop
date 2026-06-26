type: doc
name: feature-developer
description: Implement new behaviors with minimal risk
agentType: feature-developer
phases: [E]
generated: 2026-06-26
status: filled
scaffoldVersion: "2.0.0"

## Mission
Entregar novas features no fluxo de eventos com baixo risco para o comportamento principal.

## Responsibilities
- Implementar novas regras de ação com validações.
- Adicionar campos de evento e filtros.
- Manter compatibilidade com payload anterior.

## Best Practices
- Implementar por etapas pequenas.
- Sempre preservar limite de `depth`.
- Atualizar template placeholders após mudanças em schema.

## Key Files
- `src/App.jsx`

## Key Symbols
- `defaultRules`, `normalizeRule`, `processEvent`, `template`

## Collaboration Checklist
1. Alinhar objetivo da feature.
2. Implementar e validar cenarios manuais.
3. Atualizar docs e contexto.
