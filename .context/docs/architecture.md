---
type: doc
name: architecture
description: System architecture, layers, patterns, and design decisions
category: architecture
generated: 2026-06-26
status: filled
scaffoldVersion: "2.0.0"
---

## Architecture Notes
Este projeto é uma aplicação de demonstração de loops de eventos com dois módulos independentes e acoplados por HTTP/SSE:

- `server/index.js`: API HTTP em Express que recebe webhooks e distribui eventos via SSE.
- `src/App.jsx`: cliente React que conecta ao stream, processa eventos e aplica regras de automação.

## System Architecture Overview
O desenho é monolítico em runtime de desenvolvimento, com separação por superfície:

1) entrada de evento via `POST /hooks/:source` ou `POST /hooks`;
2) normalização/publicação no histórico em memória;
3) push para clientes SSE conectados;
4) processamento de regras no frontend e geração opcional de eventos sintéticos recursivos.

Não há persistência externa persistente; estado local é mantido no navegador (`localStorage`).

## Architectural Layers
- `server/`: recepção, normalização, distribuição e histórico de eventos.
- `src/`: UI, estado de regras, painel de monitoramento e renderização de logs.
- `server + browser`: contrato de integração por JSON e SSE.

## Detected Design Patterns
| Pattern | Confidence | Locations | Description |
|---|---:|---|---|
| Event-driven callback | High | `src/App.jsx` (`onMessage`, `processEvent`), `server/index.js` (`publish`) | Eventos recebidos disparam ações configuráveis por regra.
| In-memory event buffer | High | `server/index.js` (`history`) | Últimos eventos ficam em memória para replay ao conectar.
| Reactive UI state | High | `src/App.jsx` (`useState`, `useEffect`) | Re-renderiza painéis conforme chegam novos eventos.

## Entry Points
- [server/index.js:1](/home/aicoders/workspace/harness-loop/server/index.js:1)
- [src/main.jsx:1](/home/aicoders/workspace/harness-loop/src/main.jsx:1)
- [src/App.jsx:1](/home/aicoders/workspace/harness-loop/src/App.jsx:1)

## Public API
| Symbol | Type | Location |
|---|---|---|
| `normalizeEvent` | function | `server/index.js` |
| `publish` | function | `server/index.js` |
| `discoverServerUrl` | function | `src/App.jsx` |
| `processEvent` | function | `src/App.jsx` |

## Internal Boundaries
O contrato entre camadas é semântico: fonte/evento/payload no evento e metadata de controle (`id`, `receivedAt`, `synthetic`, `depth`).

## External Service Dependencies
Sem integrações externas dedicadas além de navegador e Node. O serviço consumidor envia comandos para endpoints locais (`localhost`).

## Top Directories Snapshot
- `.context/` com documentação e scaffolding de contexto.
- `server/` com o backend de eventos.
- `src/` com UI React e estilos.
- `dist/` artefatos de build.

## Related Resources
- [project-overview](/home/aicoders/workspace/harness-loop/.context/docs/project-overview.md)
- [data-flow](/home/aicoders/workspace/harness-loop/.context/docs/data-flow.md)
