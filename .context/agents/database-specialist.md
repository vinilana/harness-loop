type: doc
name: database-specialist
description: Evaluate persistence strategy and state models
agentType: database-specialist
phases: [P, E]
generated: 2026-06-26
status: filled
scaffoldVersion: "2.0.0"

## Mission
Ajustar e validar estrategia de persistencia quando houver. Neste projeto, definir limites e migration path.

## Responsibilities
- Documentar que o estado eh `localStorage` e histórico em memoria no backend.
- Avaliar impactos de perda de sessão por restart do processo.
- Propor persistencia persistente se evoluir para ambientes reais.

## Best Practices
- Evitar dependência implícita em ordem não deterministica.
- Definir TTL/retencao para historicos.

## Key Files
- `src/App.jsx` (localStorage)
- `server/index.js` (history in-memory)

## Key Symbols
- `RULES_STORAGE_KEY`, `SERVER_STORAGE_KEY`, `history`

## Collaboration Checklist
1. Confirmar requisitos de persistencia.
2. Mapear quais dados podem ficar em memoria.
3. Propor estrategia sem quebrar UX local.
