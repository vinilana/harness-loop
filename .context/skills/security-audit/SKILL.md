type: skill
name: Security Audit
description: Review code and infrastructure for security weaknesses. Use when Reviewing code for security vulnerabilities, Assessing authentication/authorization, or Checking for OWASP top 10 issues
skillSlug: security-audit
phases: [R, V]
generated: 2026-06-26
status: filled
scaffoldVersion: "2.0.0"

## Workflow
1. Map trust boundaries (API input -> server -> UI).
2. Verify parsing and validation of incoming JSON.
3. Check exposure of data in logs and localStorage.
4. Document risks with severity and patch.

## Examples
- Payload without expected fields should not break UI render.

## Quality Bar
- Clear severity (critical/high/medium/low).
- Include repro case when relevant.

## Resource Strategy
- Add security checklist entry in `.context/docs/security.md` when necessary.
