# Automaktab Analytics

Self-hosted analytics and manual B2B subscription billing for Automaktab.

**Status: full product implementation in progress, authorized on 8 October 2026.** Founder sessions, durable collection, a real worker, school projections, analytics queries, the Uzbek dashboard and reviewed billing commands are being integrated. Focused real PostgreSQL and HTTP tests have passed; combined browser acceptance and fresh independent reviews remain pending. Deployment is not claimed. The previous T02 foundation acceptance is historical evidence, not approval of the current product candidate. Full Drizzle declaration checking retains the documented `skipLibCheck: true` limitation. Read [execution progress](docs/implementation-execution-plan.md) and the [review record](docs/implementation-execution-plan-review.md).

Local runtime verification passed on 9 October 2026 for the Cloudflare Worker candidate: the loopback Wrangler/Workerd preview serves Vite assets, uses the isolated synthetic `checks-db` through local Hyperdrive, reports `/health/ready`, and supports synthetic demo sign-in plus bounded live-stream concurrency. The local smoke test covers the two-stream isolate limit, trailing-slash and `HEAD` aliases; unit tests cover slot release on request abort, cancellation, completion, read errors, delayed cleanup, and API-handler rejection. Final Worker-candidate checks passed typecheck, 65 unit tests, lint, workspace boundaries, build, and one local Workers smoke test. Database verification, synthetic seeding, and 48 integration tests passed earlier in this task before the final Worker-only rate-limit, health-check, stream-limit, and smoke-test-origin fixes. This verifies only the local synthetic runtime; remote Cloudflare resources, production Hyperdrive, SSO, and source-provider access remain unconfigured and unverified.

## Product direction

- An internal platform-owner dashboard covering all connected schools, acquisition, traffic, product usage, learning and platform subscriptions; the first release grants only the founder
- First-party collection for the marketing, tenant application, and student learning surfaces, with practice activity segmented separately
- Individually agreed school contracts: fixed monthly, fixed annual, or monthly active-student pricing
- Manual records of school payments, partial allocations, outstanding balances, overdue days, and in-app reminders
- A dark deep-gray/slate interface with tech-blue accents and DM Sans, with clear hierarchy and accessible financial workflows
- Independent hosting without a core dependency on an external analytics SaaS or session replay service

Platform subscription revenue is what a school pays Automaktab. Student tuition paid to a school is a separate domain and must never be reported as platform revenue. Recording a receipt is bookkeeping; the application does not charge a card, move money, or issue a cash refund.

## Planned stack

React, Vite, and TypeScript for the dashboard; NestJS, Drizzle, and PostgreSQL for the API; pnpm for the workspace. The first executable milestone must verify the latest stable TypeScript against the complete toolchain, record exact versions, and commit a reproducible lockfile. Exact diagnostic fixture versions and limitations are recorded in [compatibility metadata](tools/compatibility/metadata.json); the consumed foundation pipeline has qualified compatibility acceptance; further application APIs still require focused compatibility checks.

Current workspace boundaries:

- `apps/web`: Uzbek platform-owner dashboard and reviewed financial workflows
- `apps/api`: founder authorization, collection, school projections, analytics and billing modules
- `apps/worker`: separately runnable durable inbox processor with health and shutdown handling
- `packages/contracts`: shared validated transport and exact whole-so‘m money
- `packages/tracker`: bounded consent-aware first-party tracker; live installation is separate from its implementation

These modules are implementation candidates. Passing an individual test does not establish combined product acceptance or live activation.

## Start here

1. Read [AGENTS.md](AGENTS.md) for repository-specific engineering instructions and review gates
2. Read [architecture](docs/architecture.md) and [API contracts](docs/api-contracts.md) before dividing implementation work
3. Follow the dependency order in the [implementation plan](docs/implementation-plan.md)
4. Treat [UI/UX requirements](docs/ui-ux-requirements.md) as acceptance criteria, not optional polish
5. Use the [agent and skill map](docs/agent-skill-map.md) to assign a writer, independent reviewers, Tester, and Adviser
6. Keep the [decision and review register](docs/review-gates.md) open until decisions and test evidence close each item

## Approved specification and pending execution plan

Read the [5 October product/architecture specification](docs/specs/2026-10-05-analytics-design.md), [DataFast reference study](docs/reference.md), and [six-part design system](docs/design/DS00-overview.md). The latest dark direction supersedes earlier light requirements. Local application runtime and checks run in Docker; Cloudflare Workers with PostgreSQL through Hyperdrive is the configured hosted target. Wrangler's local smoke check uses the isolated `checks-db` through its local Hyperdrive binding; `/health/ready` verifies the PostgreSQL schema and the Worker serves Vite assets. This does not verify remote Cloudflare resources or production Hyperdrive behavior. Worker resource IDs, production secrets, account setup, and deployment remain separately gated.

## First executable milestone

Verify the current repository and execution environment, preserve any intervening changes, resolve package compatibility, and create a minimal workspace using synthetic data. Produce a booting UI/API, a real PostgreSQL test connection, and passing build/type/test evidence before claiming a working boilerplate.

Root workspace scripts now exist in [package.json](package.json). Run application commands only through the reviewed Docker configuration. The isolated compatibility fixture's final Docker proof passed independent QA; its commands and limitations are recorded in [evidence](tools/compatibility/evidence.json). Final T02 commands, results, review keys and limitations are recorded in the review/evidence record above. No host runtime fallback is permitted.

## Decisions still required

Whole-so‘m UZS, Asia/Tashkent billing, active-day eligibility, suspended-student exclusion, due dates, annual anniversaries, rounding, cancellation, correction and reversal rules are confirmed in the [8 October decision addendum](docs/specs/2026-10-05-analytics-design.md#product-owner-decisions-and-execution-authorization--8-october-2026). Live financial activation still requires each school's reviewed price, effective dates, opening balance and trustworthy source cutover. Synthetic examples do not supply those values.

The first release admits only an explicitly configured founder identity; team role grants remain deferred. Documentation activates neither identities nor access. Production access also requires an approved authentication integration. Live tracker collection, source-system changes, retention enforcement, outbound reminders, credential setup, and deployment have separate approval and readiness gates. Their design here does not establish approval or completion.

## Repository baseline

On 2 October 2026 at 12:56 UTC, the GitHub API reported this [repository](https://github.com/ARX-SOLUTION/automaktab-analytics) as public and empty. Repository metadata named `main` as the default branch, while the branch list was empty and the contents API explicitly reported an empty repository. There was no initialized branch or commit to inspect at that point. This is a historical baseline; recheck before publishing or implementing.

All content must remain suitable for a public repository. Use synthetic examples only. Do not commit real student records, contact information, billing records, account identifiers, secrets, credentials, private source excerpts, or private operational history.

## Completion reporting

Distinguish documentation prepared, code implemented, checks passed, checks failed, checks not run, remote publication verified, and deployment verified. None of these states implies the next one. The checklist in this package is a work contract, not a report that its checks passed.
