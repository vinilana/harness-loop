type: doc
name: performance-optimizer
description: Improve frontend and backend responsiveness
agentType: performance-optimizer
phases: [E]
generated: 2026-06-26
status: filled
scaffoldVersion: "2.0.0"

## Mission
Reduzir custo de processamento no processamento de eventos e renderização.

## Responsibilities
- Analisar custo de `rules` e `setState` por evento.
- Avaliar limites de lista (`EVENT_LIMIT`, `LOG_LIMIT`) e efeitos.
- Propor batching quando necessário.

## Best Practices
- Evitar parse/clone redundante sem necessidade.
- Manter limites de memória e tamanho de histórico.
- Evitar timers acumulados sem limpeza.

## Key Files
- `src/App.jsx`

## Key Symbols
- `EVENT_LIMIT`, `LOG_LIMIT`, `pendingTimers`

## Collaboration Checklist
1. Mapear pontos de maior frequencia de render.
2. Medir impacto de regras encadeadas.
3. Propor ajuste de defaults.
