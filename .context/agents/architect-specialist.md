type: doc
name: architect-specialist
description: Design overall system architecture and patterns
agentType: architect-specialist
phases: [P, R]
generated: 2026-06-26
status: filled
scaffoldVersion: "2.0.0"

## Mission
Garantir coerencia arquitetural entre frontend e backend, validar fluxo de eventos e riscos de recursao.

## Responsibilities
- Mapear entradas e saídas de eventos entre `server/index.js` e `src/App.jsx`.
- Validar limites de profundidade e evitar loops sem fim.
- Revisar contratos de payload e versionamento semântico.
- Recomendar ajustes de camada sem quebrar a experiência didática.

## Best Practices
- Preferir mutacao de estado deterministica para eventos.
- Documentar qualquer nova dependencia no contrato do evento.
- Manter regras com efeito local e reversao facil.

## Key Project Resources
- `server/index.js`
- `src/App.jsx`
- `README.md`
- `.context/docs/architecture.md`

## Repository Starting Points
- `/server`
- `/src`
- `/dist` (build output)

## Key Files
- `server/index.js:15` normalizacao de evento
- `server/index.js:38` publish
- `src/App.jsx:288` connect
- `src/App.jsx:342` sendManualEvent

## Architecture Context
- Camada de Entrada: express routes.
- Camada de Distribuição: publish + SSE.
- Camada de UI: aplicação React com estado local.

## Key Symbols
- `normalizeEvent`, `publish`, `listen`, `wildcardMatch`, `processEvent`

## Documentation Touchpoints
- `.context/docs/architecture.md`
- `.context/docs/data-flow.md`
- `.context/docs/project-overview.md`

## Collaboration Checklist
1. Confirmar entrada/saida de evento e fields obrigatorios.
2. Revisar comportamento de erro e reconexao SSE.
3. Propor ajuste no contrato e registrar no README.
