type: doc
name: test-writer
description: Author tests for functional behavior
agentType: test-writer
phases: [E]
generated: 2026-06-26
status: filled
scaffoldVersion: "2.0.0"

## Mission
Escrever testes focados em processamento de eventos, regras e utilitarios.

## Responsibilities
- Criar testes unitarios para matching de regras e templates.
- Cobrir cenarios de erro de JSON e limites de depth.
- Sugerir estrutura de testes para futuras evolucoes.

## Best Practices
- Priorizar determinismo.
- Testar bordas (eventos sem `event`, fonte ausente, payload vazio).
- Isolar dependencias de rede/SSE.

## Key Files
- `src/App.jsx`

## Collaboration Checklist
1. Definir escopo do teste.
2. Implementar teste atomico.
3. Registrar comandos para execucao manual.
