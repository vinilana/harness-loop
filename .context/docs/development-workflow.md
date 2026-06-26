---
type: doc
name: development-workflow
description: Day-to-day engineering processes, branching, and contribution guidelines
category: workflow
generated: 2026-06-26
status: filled
scaffoldVersion: "2.0.0"
---

## Development Workflow
Fluxo padrão para alterações:

1. Ler contexto em `.context/docs/project-overview.md` e `.context/docs/architecture.md`.
2. Fazer mudança no código.
3. Ajustar template/context se necessário.
4. Confirmar visualmente que a aplicação sobe com `npm run dev`.

## Branching & Releases
O repositório não define estratégia Git formal aqui; use um fluxo de ramificação padrão de sua organização. Para pequenos ajustes, manter um branch por tarefa e validar com `dev` local.

## Local Development
- Instalar dependências: `pnpm install` (ou `npm install` com `package-lock` equivalente).
- Rodar backend: `npm run dev:api`.
- Rodar UI: `npm run dev:ui`.
- Rodar ambos: `npm run dev`.
- Build de produção: `npm run build`.

## Code Review Expectations
Antes de enviar alteração, revisar:
- estado atual de regras e painéis não quebra fluxo (`src/App.jsx`);
- endpoints e contratos de evento;
- logs de conexão SSE e comportamento de reconexão.

Sem revisão formal exigida por fluxo local, manter mudanças pequenas e rastreáveis.
