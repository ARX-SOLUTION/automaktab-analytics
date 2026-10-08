# Automaktab Analytics

## Before changing anything

Read `README.md`, `docs/architecture.md`, `docs/api-contracts.md`, and the relevant gates in `docs/review-gates.md`. Record the task's allowed repository, paths, behavior, verification, and stopping condition; list unresolved business decisions instead of guessing. Verify a tool or skill exists before relying on it.

## Scope and data boundaries

The confirmed product is the platform owner's internal monitoring and platform-billing tool. Founder-only access and Uzbek Latin UI are approved for the first release; team grants remain deferred. Exact live founder identity must be explicitly configured. These documents do not supply credentials.

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

## Pointers

- Any product-facing UI change: `docs/ui-ux-requirements.md` (criterion IDs, evidence format) and `docs/design/DS00-overview.md` (dark slate + tech-blue, DM Sans; supersedes the earlier light direction). Cover loading, empty, error, stale/partial data, no-permission, keyboard, narrow screens, duplicate actions, and Back/Forward; the exact candidate needs a Tester PASS before delivery. Never show a committed receipt or invoice close before the server confirms it.
- Implementation, review, or delivery: `docs/engineering-workflow.md` (roles, two independent reviews per task, implementation loop, handoff format) and `docs/agent-skill-map.md#mandatory-role-isolation-and-execution-boundaries`.
- Scripts: use the exact script names once they exist in `package.json`; a focused test pass does not replace workspace lint, type, integration/E2E, build, migration, and boundary checks.
