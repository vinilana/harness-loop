type: skill
name: Code Review
description: Review changes for risk and correctness.\nUse when Reviewing code in a pull-request context.
skillSlug: code-review
phases: [R]
generated: 2026-06-26
status: filled
scaffoldVersion: "2.0.0"

## Workflow
1. Confirm change intent and scope.
2. Review event flow, state updates, and side effects.
3. Check for undefined values and parser errors.
4. Verify UI strings and accessibility impacts.
5. Return concrete action items ordered by severity.

## Examples
- Review of rule processing should mention `wildcardMatch` and `safeDepth` boundary checks.

## Quality Bar
- Severity-first feedback.
- No broad refactor suggestions for small fixes.
- Validate any schema or contract change.

## Resource Strategy
- Keep review comments in one concise thread per concern.
