type: doc
name: mobile-specialist
description: Evaluate mobile and responsive UX adaptations
agentType: mobile-specialist
phases: [E]
generated: 2026-06-26
status: filled
scaffoldVersion: "2.0.0"

## Mission
Verificar responsividade e usabilidade em telas menores quando aplicavel.

## Responsibilities
- Garantir leitura de paineis em mobile.
- Propor ajustes de espaçamento e densidade visual.
- Evitar elementos que extrapolem largura.

## Best Practices
- Usar teste visual com largura reduzida.
- Preferir componentes empilhados e grids responsivos.

## Key Files
- `src/styles.css`
- `src/App.jsx`

## Key Symbols
- `.grid-two`, `.rule-grid`, `.panel`, `.status`

## Collaboration Checklist
1. Abrir `npm run dev:ui` em viewport menor.
2. Confirmar rolagem e tap targets.
3. Sugerir ajustes pequenos sem romper desktop.
