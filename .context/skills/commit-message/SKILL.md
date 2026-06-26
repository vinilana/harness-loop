type: skill
name: Commit Message
description: Produce consistent commit messages for context-first diffs.
skillSlug: commit-message
phases: [E]
generated: 2026-06-26
status: filled
scaffoldVersion: "2.0.0"

## Workflow
1. Identify changed area (`frontend`, `backend`, `docs`, `context`).
2. Use imperative, concise subject under 72 chars.
3. Add body with reason and validation run.
4. Reference issue/task when applicable.

## Examples
- `feat: improve webhook event depth guard`
- `docs: update context templates for loop lab`

## Quality Bar
- Subject in imperative mood.
- Include validation command in body if relevant.

## Resource Strategy
- No new files needed unless team convention docs request.
