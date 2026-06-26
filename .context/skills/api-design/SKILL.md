type: skill
name: Api Design
description: Design and review HTTP endpoints for this project.\nUse when Designing new API endpoints or adjusting existing webhook routes.
skillSlug: api-design
phases: [P, E]
generated: 2026-06-26
status: filled
scaffoldVersion: "2.0.0"

## Workflow
1. Confirm endpoint contract (method, path, status, body).
2. Map input fields (`source`, `event`, `payload`) and defaults in `normalizeEvent`.
3. Define error behavior for invalid JSON and missing body.
4. Keep response shape stable to avoid breaking frontend SSE consumers.
5. Validate with manual curl flow against local server.

## Examples
- `POST /hooks/:source` with body `{ "event": "agent.started", "payload": {"message": "x"} }`
- `GET /events/stream` should return SSE frames and history replay.

## Quality Bar
- Endpoint response should stay compatible unless a migration is accepted.
- All routes should have clear status and logging.
- Keep route side effects explicit and bounded.

## Resource Strategy
- No extra files required unless endpoint docs exceed one page.
- Add tests only when endpoint changes.
