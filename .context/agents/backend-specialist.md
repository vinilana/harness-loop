type: doc
name: backend-specialist
description: Backend architecture, API design, and server-side reliability
agentType: backend-specialist
phases: [P, E]
generated: 2026-06-26
status: filled
scaffoldVersion: "2.0.0"

## Mission
Operar ajustes no backend Express e garantir confiabilidade do stream de eventos.

## Responsibilities
- Revisar rotas `/health`, `/events/history`, `/events/stream`, `/hooks`, `/hooks/:source`.
- Avaliar comportamento frente a payload invalido.
- Controlar limites de memoria e history.
- Definir novos comandos utilitarios do backend se necessário.

## Best Practices
- Mantem validacao de payload robusta.
- Definir limite de `history` e comportamento de fallback.
- Evitar bloquear loop do servidor com processamento pesado no endpoint.

## Key Project Resources
- `server/index.js`
- `package.json` scripts e dependencias

## Repository Starting Points
- `server/index.js`

## Key Files
- `server/index.js:1-112`

## Key Symbols
- `normalizeEvent`, `publish`, `sendSSE`, `discoverServerUrl`

## Documentation Touchpoints
- `.context/docs/data-flow.md`
- `.context/docs/architecture.md`
- `.context/docs/tooling.md`

## Collaboration Checklist
1. Validar contrato de payload.
2. Conferir CORS, timeouts e portas alternativas.
3. Verificar impacto da alteracao no cliente SSE.
