---
type: doc
name: glossary
description: Project terminology, type definitions, domain entities, and business rules
category: glossary
generated: 2026-06-26
status: filled
scaffoldVersion: "2.0.0"
---

## Glossary & Domain Concepts
- Hook: requisição HTTP recebida em `/hooks`.
- Source: origem do evento (`codex`, `claude`, `cursor`, `antigravity`, ou livre).
- Event: nome do evento (`agent.started`, `task.completed`, etc.).
- Rule: configuração que define ação ao casar `sourcePattern` e `eventPattern`.
- Synthetic event: evento gerado internamente por regra de ação `emit`.
- Depth: controle de recursão para evitar loops infinitos.

## Core Terms
- `payload`: objeto enviado em cada evento.
- `history`: memória dos últimos eventos no servidor.
- SSE: stream de eventos em tempo real via `EventSource`.

## Type Definitions
Não há tipos TypeScript explícitos. Campos de evento principais:
- `id`, `source`, `event`, `payload`, `receivedAt`, `raw`.
- Regras: `id`, `name`, `enabled`, `sourcePattern`, `eventPattern`, `action`, `maxDepth`.

## Enumerations
- `action`: `note`, `counter`, `emit`.

## Domain Rules & Invariants
- Eventos só avançam se correspondem a padrões habilitados.
- Regras com `emit` respeitam limite de profundidade para evitar explosão de loops.
