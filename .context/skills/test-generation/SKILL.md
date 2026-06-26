type: skill
name: Test Generation
description: Generate comprehensive test cases for code. Use when Writing tests for new functionality, Adding tests for bug fixes (regression tests), or Improving test coverage for existing code
skillSlug: test-generation
phases: [E, V]
generated: 2026-06-26
status: filled
scaffoldVersion: "2.0.0"

## Workflow
1. Identify function and edge cases.
2. Define minimal test matrix.
3. Add deterministic tests.
4. Keep external dependencies mocked.

## Examples
- Unit test for `wildcardMatch` with `*` and literal matching.
- Test that `processEvent` enforces maxDepth.

## Quality Bar
- Cover happy path and at least one failure case.
- Avoid brittle snapshot-heavy assertions.

## Resource Strategy
- If no test framework exists, propose setup plan first instead of adding fake tests.
