# Loop Lab de Hooks (React + Vite)

Aplicação didática para estudar **event loops de automação** com webhooks de:

- Codex
- Claude Code
- Cursor
- Antigravity

Ela tem dois módulos:

1. Servidor Node (`server/index.js`) com endpoints para receber eventos e publicar SSE.
2. Frontend React (`vite`) para listar eventos, configurar regras e executar ações simuladas.

## Começando

```bash
npm install
npm run dev:api     # inicia o servidor de webhooks em 4000
npm run dev:ui      # inicia o frontend React em 5173
```

Abra `http://localhost:5173`.

## Endpoints de entrada

- `POST /hooks/:source`
- `POST /hooks`

Exemplo rápido com `curl`:

```bash
curl -X POST http://localhost:4000/hooks/codex \
  -H "Content-Type: application/json" \
  -d '{"event":"agent.started","payload":{"message":"primeiro loop"}}'
```

## SSE

- `GET /events/stream` → stream em tempo real no navegador.

## Regras de ação

As regras definem o que acontece para cada evento recebido:

- `note`: escreve anotação no log
- `counter`: incrementa um contador por nome (template)
- `emit`: emite evento sintético (`source`, `event`, `delay`) com limite de profundidade

### Placeholders disponíveis

- `{{id}}`
- `{{source}}`
- `{{event}}`
- `{{payload.campo}}`
- `{{depth}}`

## Dica pedagógica

Defina uma regra de `emit` para eventos do tipo `task.started` e limite de profundidade baixo (`2` ou `3`) para visualizar rapidamente como um evento gera outro evento e reentra no motor de regras.

