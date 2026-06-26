type: skill
name: Documentation
description: Generate and update technical documentation. Use when Documenting new features or APIs, Updating docs for code changes, or Creating README or getting started guides
skillSlug: documentation
phases: [P, C]
generated: 2026-06-26
status: filled
scaffoldVersion: "2.0.0"

## Workflow
1. Read changed code paths and identify impacted workflows.
2. Update the minimal doc set (`project-overview`, `architecture`, `data-flow`).
3. Keep examples executable in current project state.
4. Check for stale commands and link references.

## Examples
- Add one section explaining how `/hooks/:source` builds normalized event.
- Update quickstart commands when scripts change.

## Quality Bar
- No placeholders.
- Commands must be runnable in the repo.
- Keep docs in Portuguese when repo docs are Portuguese.

## Resource Strategy
- Prefer single-file updates over adding extra references.
