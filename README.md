# Automaktab Analytics

Self-hosted analytics and manual B2B subscription billing for Automaktab.

**Status: documentation only. Runtime implementation and executable checks have not yet been completed.** This repository bootstrap describes what to build, how to divide the work, and what must be verified. It does not contain a runnable application, dependency manifest, installed agent skills, database migrations, or deployment configuration.

## Product direction

- An internal founder/team dashboard covering acquisition, traffic, product usage, learning, schools, and platform subscriptions
- First-party collection for the marketing, tenant application, and student learning surfaces, with practice activity segmented separately
- Individually agreed school contracts: fixed monthly, fixed annual, or monthly active-student pricing
- Manual records of school payments, partial allocations, outstanding balances, overdue days, and in-app reminders
- A dark deep-gray/slate interface with tech-blue accents and DM Sans, with clear hierarchy and accessible financial workflows
- Independent hosting without a core dependency on an external analytics SaaS or session replay service

Platform subscription revenue is what a school pays Automaktab. Student tuition paid to a school is a separate domain and must never be reported as platform revenue. Recording a receipt is bookkeeping; the application does not charge a card, move money, or issue a cash refund.

## Planned stack

React, Vite, and TypeScript for the dashboard; NestJS, Drizzle, and PostgreSQL for the API; pnpm for the workspace. The first executable milestone must verify the latest stable TypeScript against the complete toolchain, record exact versions, and commit a reproducible lockfile. No exact dependency versions or compatibility result are established by these documents.

Proposed workspace boundaries:

- `apps/web`: founder dashboard
- `apps/api`: modular API and background worker
- `packages/contracts`: runtime-validated transport contracts shared by the API and UI
- `packages/tracker`: small, privacy-filtered first-party browser tracker

These paths describe the planned application. Their presence in documentation does not mean they already exist.

## Start here

1. Read [AGENTS.md](AGENTS.md) for repository-specific engineering instructions and review gates
2. Read [architecture](docs/architecture.md) and [API contracts](docs/api-contracts.md) before dividing implementation work
3. Follow the dependency order in the [implementation plan](docs/implementation-plan.md)
4. Treat [UI/UX requirements](docs/ui-ux-requirements.md) as acceptance criteria, not optional polish
5. Use the [agent and skill map](docs/agent-skill-map.md) to assign a writer, independent reviewers, Tester, and Adviser
6. Keep the [decision and review register](docs/review-gates.md) open until decisions and test evidence close each item

## Approved specification and pending execution plan

Read the [5 October product/architecture specification](docs/specs/2026-10-05-analytics-design.md), [DataFast reference study](docs/reference.md), and [six-part design system](docs/design/DS00-overview.md). The latest dark direction supersedes earlier light requirements. Local application runtime is Docker only; DigitalOcean is the deployment target. Written spec and DS were approved on 5 October 2026. The separate [execution plan](docs/implementation-execution-plan.md) awaits bounded plan/execution approval. No runtime or deployment capability is established by these documents.

## First executable milestone

Verify the current repository and execution environment, preserve any intervening changes, resolve package compatibility, and create a minimal workspace using synthetic data. Produce a booting UI/API, a real PostgreSQL test connection, and passing build/type/test evidence before claiming a working boilerplate.

There are intentionally no install or run commands here yet: no scripts have been implemented or verified. Add exact commands and prerequisites only after they work in the application repository.

## Decisions still required

Real financial activation requires a confirmed currency and scale, business timezone, day-count/proration policy, suspended-student treatment, due-date convention, annual anniversary rule, rounding/allocation rules, correction rules, and each school's price and effective dates. None may be inferred from examples or silently enabled as defaults.

The proposed least-privilege bootstrap admits only an explicitly confirmed founder identity until team role grants are approved. Documentation activates neither identities nor access. Production access also requires an approved authentication integration. Live tracker collection, source-system changes, retention enforcement, outbound reminders, credential setup, and deployment have separate approval and readiness gates. Their design here does not establish approval or completion.

## Repository baseline

On 2 October 2026 at 12:56 UTC, the GitHub API reported this [repository](https://github.com/ARX-SOLUTION/automaktab-analytics) as public and empty. Repository metadata named `main` as the default branch, while the branch list was empty and the contents API explicitly reported an empty repository. There was no initialized branch or commit to inspect at that point. This is a historical baseline; recheck before publishing or implementing.

All content must remain suitable for a public repository. Use synthetic examples only. Do not commit real student records, contact information, billing records, account identifiers, secrets, credentials, private source excerpts, or private operational history.

## Completion reporting

Distinguish documentation prepared, code implemented, checks passed, checks failed, checks not run, remote publication verified, and deployment verified. None of these states implies the next one. The checklist in this package is a work contract, not a report that its checks passed.
