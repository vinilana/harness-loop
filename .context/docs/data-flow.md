---
type: doc
name: data-flow
description: How data moves through the system and external integrations
category: data-flow
generated: 2026-06-26
status: filled
scaffoldVersion: "2.0.0"
---

## Data Flow & Integrations
Fluxo de dados:

1. Cliente envia `POST` para `http://localhost:4000/hooks/:source`.
2. `normalizeEvent` define `source`, `event`, `payload`, `id` e `receivedAt`.
3. Evento é armazenado em `history` e publicado para clientes SSE conectados.
4. `src/App.jsx` recebe pelo `EventSource`, cria log e eventos visuais.
5. Cada evento é testado contra as regras e pode gerar novo evento sintético, criando cadeia.

Não há fila externa ou banco; o replay em nova conexão é feito pelo `history` em memória.

## Module Dependencies
- `src/App.jsx` depende da API HTTP e SSE do `server/index.js`.
- `server/index.js` não depende de módulos internos além de `express` e `cors`.

## Service Layer
- `normalizeEvent` (server): converte entradas de vários formatos para evento canônico.
- `publish` (server): registra e envia para clientes.
- `processEvent` (UI): aplica regras, atualiza logs e dispara eventos sintéticos.

## High-level Flow
Entrada síncrona (webhook) entra no backend. O backend transforma em evento, mantém histórico, envia SSE. O frontend mantém UI responsiva, persistindo regras e URL do servidor em `localStorage`.

## Observability & Failure Modes
- Falhas típicas: conexão SSE interrompida, payload JSON inválido no envio manual, ausência do backend.
- `EventSource` reconexão depende do browser; em erro o status vira `desconectado`.
- Eventos inválidos no parser aparecem no log com aviso.

## Related Resources
- [architecture](/home/aicoders/workspace/harness-loop/.context/docs/architecture.md)
