# Repository engineering instructions

These are original, repository-specific instructions for work on Automaktab Analytics. They express project expectations; they do not technically enforce permissions, install tools, or replace the execution environment's policies.

## Read before changing anything

1. Inspect the actual checkout, current branch, working tree, and any more specific instructions. Preserve existing files and other contributors' work. Do not assume the repository is still empty
2. Read `README.md`, `docs/architecture.md`, `docs/api-contracts.md`, `docs/ui-ux-requirements.md`, and the relevant implementation/review gates
3. Record the task's allowed repository, paths, behavior, verification, and stopping condition. Document unresolved business decisions without guessing an answer
4. Check the current executor's available tools and relevant skills. If a catalog entry is unavailable, report that fact and use an authorized alternative; never claim an installation or capability without checking it
5. For implementation, use the authorized development task/environment. Documentation preparation is not evidence that application execution has begun

## Scope and data boundaries

The confirmed product is an internal founder/team tool, not a school portal. Founder-only access is a proposed least-privilege bootstrap until team role grants are approved. Neither identities nor access are activated by these documents.

- This repository owns the analytics application and its synthetic integration adapters
- Changes to an operational source application require a separately scoped task and authorization for that repository. Do not silently expand the work into other repositories
- Publication, merge, deployment, migration execution on live data, credential creation, and live integration activation require their applicable approval. A plan is not authorization
- Public repository content must use synthetic data and public-safe project information. Keep private account details, customer records, student data, financial records, private source snippets, logs, and secrets out of commits and fixtures
- Never bypass an access denial or execution restriction by moving the same blocked work elsewhere

## Engineering rules

- Use React + Vite, NestJS, Drizzle, PostgreSQL, pnpm, and TypeScript as specified. Validate latest stable TypeScript compatibility before selecting exact pins; do not quietly downgrade or switch frameworks
- Start with a modular API and a worker, not distributed services. Keep calculation/domain code independent of HTTP, NestJS, and Drizzle
- Controllers validate requests and call named use cases. Persistence adapters use the transaction handle supplied by the application transaction boundary
- Share transport schemas through `packages/contracts`. The frontend must not import ORM models or server internals
- Treat browser telemetry as untrusted. It cannot establish school ownership, official learning results, a billable lifecycle change, or a payment
- School is the source `Company.id`. Bill a canonical school-scoped subject once; a shared phone number is never identity evidence
- Keep platform billing separate from school tuition. Use integer minor-unit money with explicit currency and server-confirmed scale
- Financial writes need transactional idempotency, business uniqueness, concurrency control, append-only audit, and recovery from an uncertain response
- Frozen invoices remain immutable. Receipt reversal and invoice correction are different operations
- A gap-free local inbox is insufficient proof of source completeness. Unsafe closes must fail until an authoritative source barrier and all dependencies are satisfied
- Do not activate live billing, tracking, external reminders, or production auth using guessed policies or credentials
- Use bounded requests, queues, retries, and retention. Redact logs. Missing, stale, and partial data must never appear as reliable zeroes

## UI/UX is part of correctness

The current user direction (5 October 2026) is dark deep-gray/slate with tech-blue accents and DM Sans. It supersedes the earlier light direction. The review-ready design specification is [DS00–DS05](docs/design/DS00-overview.md); implementation still requires the written-spec and plan gates. Define one versioned design-token/asset manifest before broad UI implementation. Use original composition and licensed assets; do not copy proprietary source or branding.

Every product-facing UI change must cover loading, empty, error, stale/partial data, no-permission, keyboard use, narrow screens, duplicate actions, Back/Forward, interrupted sessions, and changed filters. Financial actions require explicit preview/review where specified. Never optimistically show a committed receipt or invoice close before the server confirms it.

For implemented product-facing changes, Tester must issue PASS for the exact candidate before delivery. Unmet or unverified mandatory UI/UX criteria block delivery; post-publication smoke testing is additional. Use the criterion IDs and evidence format in `docs/ui-ux-requirements.md`.

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
