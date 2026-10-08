# Engineering workflow

Team roles, implementation loop, and handoff format for Automaktab Analytics. Reached from `AGENTS.md` for any implementation, review, or delivery task.

## Team workflow

Use the self-contained mandatory role-isolation and execution boundaries in [the agent/skill map](docs/agent-skill-map.md#mandatory-role-isolation-and-execution-boundaries). R1/R2 use fresh task-scoped contexts, submit independent initial reports before seeing each other, and never execute project/package code or edit files. A separate fresh verification-only QA context runs only approved allowlisted commands; QA authors cannot verify their own candidate. Tester is black-box, edits no source/tests/fixtures/configuration, runs no project/diagnostic scripts, and verifies authorized synthetic outbound sinks before consequential tests. Each task has one accountable writer and clearly owned files. Parallelize only independent work after shared contracts are agreed.

Shared contracts, migration ordering, dependency manifests/lockfiles, and design tokens have one designated writer at a time. Other implementers request changes through that owner. Reviewers do not silently patch the same files during independent review.

Every implementation task must receive two independent reviews:

1. **Correctness reviewer:** requirements, domain calculations, completeness, edge cases, and integration behavior
2. **Security/data reviewer:** authorization, tenant ownership, privacy, concurrency, idempotency, and failure recovery

The implementer cannot approve their own task. Tester and Adviser are additional roles, not substitutes for either independent reviewer. Record reviewer identity/role, reviewed revision, test/visual evidence digest, findings, fix evidence, and re-review outcome. Any candidate or review-key change invalidates both approvals. Both reviewers must reassess the new exact snapshot; a documented scoped/no-impact reassessment is acceptable when justified.

## Implementation loop

1. Define a small vertical slice, its input/output contracts, acceptance tests, and unresolved decisions
2. Add failing tests for the required behavior and confirm they fail for the intended reason
3. Implement the smallest maintainable change within owned paths
4. Run focused checks and inspect the real UI where relevant
5. Obtain both independent reviews; fix findings and re-run affected checks
6. Have Tester execute the integrated behavior and Adviser challenge assumptions and remaining risk
7. Integrate under the designated writer, then obtain both independent reviews and verification on the exact combined candidate, even when integration was mechanical. Product-facing delivery also requires the exact-candidate Tester PASS

Do not invent runnable commands while this repository is documentation-only. Once scripts exist, document and use their exact names. A focused test pass does not replace workspace lint, type checks, unit/integration/E2E checks, production builds, migration verification, or boundary checks.

## Required handoff

Report the outcome first, followed by:

- Files and behavior changed; source and target revision
- Exact verification commands and their results, including failures and never-run checks
- UI evidence for changed screens and edge states, using synthetic records
- Findings from both reviewers, Tester, and Adviser, with unresolved items
- Any new contract/migration/design decision and its compatibility effect
- Remaining decisions, risks, and the next bounded task

Before reporting publication, verify the remote commit. Before reporting CI success, inspect checks for that exact revision. Before reporting a running service, verify the deployed application. Stop dependent work when authorization, source completeness, security, or a financial policy decision is missing, while continuing independent authorized tasks.
