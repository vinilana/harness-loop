---
type: doc
name: security
description: Security policies, authentication, secrets management, and compliance requirements
category: security
generated: 2026-06-26
status: filled
scaffoldVersion: "2.0.0"
---

## Security & Compliance Notes
Projeto local sem autenticação por padrão, focado em laboratório. A segurança operacional é baseada em isolamento de ambiente e exposição local.

## Authentication & Authorization
Não há autenticação/authorization implementada. Em ambiente de aula, manter em rede local e endpoints sem exposição pública.

## Secrets & Sensitive Data
Não devem ser salvos segredos no código ou no `localStorage`. O projeto não usa `.env` e não armazena tokens.

## Operational Notes
- Mantenha o servidor atrás de reverse proxy com auth se exposto externamente.
- Limite CORS e origens permitidas fora de desenvolvimento local conforme necessário.

## Recommendations
- Remover/ocultar payloads sensíveis antes de demonstrar publicamente.
- Registrar somente metadados de evento nos logs.
