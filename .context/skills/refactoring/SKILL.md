type: skill
name: Refactoring
description: Refactor code safely with a step-by-step approach. Use when Improving code structure without changing behavior, Reducing code duplication, or Simplifying complex logic
skillSlug: refactoring
phases: [E]
generated: 2026-06-26
status: filled
scaffoldVersion: "2.0.0"

## Workflow
1. Identify exact function to simplify.
2. Create minimal equivalent implementation.
3. Keep existing behavior and defaults.
4. Run build to confirm.
5. Describe tradeoffs.

## Examples
- Split event processing into smaller helpers and reuse with tests.

## Quality Bar
- No semantic drift.
- Preserve identifiers used externally.

## Resource Strategy
- Keep refactor confined to the touched file by default.
