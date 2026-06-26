type: skill
name: Bug Investigation
description: Debug reproducible issues from logs and event traces.\nUse when Tracking down regression in event pipeline.
skillSlug: bug-investigation
phases: [E]
generated: 2026-06-26
status: filled
scaffoldVersion: "2.0.0"

## Workflow
1. Capture exact repro steps (payload, endpoint, expected vs observed).
2. Check server logs and frontend status (`desconectado`, `conectado`).
3. Validate rule matching logic and depth checks.
4. Fix one hypothesis and retest with same payload.
5. Document root cause and prevention.

## Examples
- Event fails to appear: verify `discoverServerUrl` and URL in UI.
- Infinite chain: verify `maxDepth` and `depth` increments.

## Quality Bar
- No change without reproducible reproduction.
- Prefer smallest fix that preserves behavior elsewhere.
- Include manual smoke test in notes.

## Resource Strategy
- No additional resources needed unless a full incident template is required.
