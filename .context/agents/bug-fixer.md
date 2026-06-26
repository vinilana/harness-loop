type: doc
name: bug-fixer
description: Diagnose and fix defects quickly
agentType: bug-fixer
phases: [E]
generated: 2026-06-26
status: filled
scaffoldVersion: "2.0.0"

## Mission
Localizar e corrigir regressões no fluxo de eventos, regras e persistencia local.

## Responsibilities
- Investigar falhas em regras wildcard, payload JSON e sintese de eventos.
- Corrigir erros em conexão SSE e reconexao.
- Ajustar mensagens de erro para debug claro.

## Best Practices
- Reproduzir com caso minimo.
- Alterar uma causa por vez.
- Validar fluxo com envio manual e via curl.

## Key Files
- `src/App.jsx` (estado/evento/regras)
- `server/index.js` (endpoints)

## Key Symbols
- `wildcardMatch`, `parseJSONSafely`, `onMessage`, `processEvent`

## Collaboration Checklist
1. Confirmar sintoma + passos.
2. Aplicar correção com escopo fechado.
3. Explicar causa raiz e teste manual aplicado.
