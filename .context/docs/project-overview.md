---
type: doc
name: project-overview
description: High-level overview of the project, its purpose, and key components
category: overview
generated: 2026-06-26
status: filled
scaffoldVersion: "2.0.0"
---

## Project Overview
Loop Lab de Hooks é uma aplicação didática para estudar e demonstrar ciclos de automação por webhooks. Recebe eventos, exibe histórico em tempo real e permite que regras disparem ações locais e eventos sintéticos.

## Codebase Reference
> Semantic Snapshot: `context({ action: "getMap", section: "all" })`.

## Quick Facts
- Root: `/home/aicoders/workspace/harness-loop`
- Runtime: Node.js (backend) + React/Vite (frontend)
- Entry points: `server/index.js`, `src/main.jsx`

## Entry Points
- Backend: [server/index.js](/home/aicoders/workspace/harness-loop/server/index.js:1)
- UI: [src/main.jsx](/home/aicoders/workspace/harness-loop/src/main.jsx:1)
- App principal: [src/App.jsx](/home/aicoders/workspace/harness-loop/src/App.jsx:1)

## Key Exports
- API endpoints: `GET /health`, `GET /events/history`, `GET /events/stream`, `POST /hooks`, `POST /hooks/:source`
- Estados principais de UI: lista de eventos, log de ações, contadores e regras persistidas.

## File Structure & Code Organization
- `server/`: backend Express.
- `src/`: frontend React.
- `index.html`, `vite.config.js`: bootstrap do front.
- `.context/`: documentação e guias de contexto operacional.

## Technology Stack Summary
- JavaScript, React 18, Express 4, Vite 6.

## Getting Started Checklist
1. `npm install`
2. `npm run dev:api`
3. `npm run dev:ui`
4. Abrir `http://localhost:5173`
5. Enviar um evento de teste com botão do painel

## Next Steps
Use este projeto para experimentar padrões de regras e controlar recursão de eventos antes de aplicar a mesma ideia em automações reais.
