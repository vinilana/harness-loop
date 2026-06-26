type: skill
name: Pr Review
description: Review pull requests against team standards and best practices. Use when Reviewing a pull request before merge, Providing feedback on proposed changes, or Validating PR meets project standards
skillSlug: pr-review
phases: [R, V]
generated: 2026-06-26
status: filled
scaffoldVersion: "2.0.0"

## Workflow
1. Confirm intent and impacted files.
2. Validate event contract compatibility.
3. Check resource updates in `.context` when behavior changed.
4. Note blocking issues and optional improvements separately.

## Examples
- "Blocking: normalizeEvent changed event field without client compatibility".
- "Suggestion: add maxDepth test case in docs/smoke flow".

## Quality Bar
- Prioritize correctness before style.
- Avoid generic comments.

## Resource Strategy
- Add evidence snippets in review text, no extra files.
