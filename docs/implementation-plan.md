# Coding-start implementation plan

The historical repository baseline is documented in the README. The latest user direction (5 October 2026) is dark deep-gray/slate, tech-blue and DM Sans, superseding the earlier light requirement. Read the [current written specification](specs/2026-10-05-analytics-design.md) and [DS00–DS05](design/DS00-overview.md) before preparing an execution plan. Local application runtime is Docker only; DigitalOcean is the deployment target. Written spec and DS were approved on 5 October 2026; bounded plan/execution approval remains required. Read the separate [execution plan](implementation-execution-plan.md). All implementation milestones below are pending. Checkboxes and acceptance criteria are requirements, not completed work.

## Dependency order

Start with repository/environment verification and decisions, then the compatibility spike and common contracts. Frontend and backend can proceed in parallel once their shared DTOs, trust boundaries, and error behavior are agreed. Billing depends on source-complete projections, stable subjects, policy definitions, and PostgreSQL transaction tests. Live integrations and deployment follow independent scope/activation gates.

Use one writer per owned area and one designated writer for shared contracts, migrations, dependency manifests/lockfile, and design tokens. Each implementation task receives two fresh, task-scoped independent reviews before integration, under the inspection-only boundaries in [the agent/skill map](agent-skill-map.md#mandatory-role-isolation-and-execution-boundaries). Execution evidence comes from separate verification-only QA. Tester checks integrated behavior; Adviser challenges assumptions. Both reviewers and verification-only QA assess the final combined revision even when integration is mechanical. Any candidate or review-key change invalidates both approvals; both reviewers must reassess the new exact snapshot, using a documented scoped/no-impact reassessment where appropriate.

## M0. Baseline, scope, and decisions

**Owner:** Coordinator with Requirements Research and Architect. **Output:** current baseline and bounded task contracts.

- Inspect current branch/commit, existing files, repository visibility, and working tree. Preserve intervening work; do not initialize over an existing application
- Confirm the authorized executor and repository scope. Keep source-system integrations as synthetic adapters until those repositories are separately authorized
- Turn the 14 items in `review-gates.md` into tracked decisions with owner, status, evidence, and blockers
- Confirm the current design direction; plan one versioned token/asset manifest
- Record financial decisions that are still unknown. Decide which configurable/synthetic work can safely proceed independently
- Define public-content hygiene and the exact publication target; never copy private history into the repository

**Exit:** the next task has a named writer, owned paths, acceptance evidence, and explicit scope. No runtime claim is made.

## M1. Toolchain compatibility and bootable workspace

**Owner:** Release Integrator as sole dependency/workspace writer, supported by Backend and Frontend Implementers. **Dependencies:** M0.

- Resolve the latest stable TypeScript and exact supported Node/pnpm/framework/library/test versions from official sources at execution time
- Prove Nest decorator/DI and module-format behavior, Drizzle database/migration tooling, Vite/React builds, linting, unit tests, integration tests, and browser tests work together
- Use package metadata to decide ESM/NodeNext and import conventions; do not copy an unverified version-specific configuration
- If a conflict appears, record the incompatibility and compatible options. Do not silently downgrade TypeScript or change the selected stack
- Create the workspace, basic web/API entry points, validated configuration, readiness/health, test database integration, and synthetic fixture support
- Establish actual lint/typecheck/test/build commands and dependency lockfile; update README with tested commands and prerequisites
- Add a clearly labeled synthetic UI shell using the approved dark direction. Do not show invented data as live metrics

**Required evidence:** exact versions, lockfile, successful clean install, minimal UI/API boot, real PostgreSQL connectivity, build/typecheck/unit smoke results, and a browser smoke result. This milestone establishes a working boilerplate only after those checks pass.

## M2. Contracts, founder boundary, and tracker

**Owners:** Architect coordinates; Contracts Writer owns shared schemas; Backend and Frontend Implementers own separate paths. **Dependencies:** M1.

- Define runtime-validated HTTP/event schemas, OpenAPI, error codes, money/date serialization, query metadata, and contract evolution rules
- Implement auth through an adapter with synthetic identity fixtures first. Test founder/non-founder, impersonation, expiry, replay, state/audience, revoke, provider outage, CSRF, and cache cleanup
- Implement separate public/trusted collectors, durable admission receipts, event deduplication/conflict detection, payload/rate limits, and source scoping
- Implement the tracker with allowlists, route sanitization, stable retry IDs, bounded offline queue, and approved consent behavior
- Test navigation/remount duplication, offline replay, disallowed PII/form fields, forged trust/ownership claims, unknown event versions, and storage failure before acknowledgment

**Exit:** typed UI/API contracts agree; public events cannot enter trusted projections or financial commands; the tracker cannot break core product flows. Production credentials, founder setup, and live tracking remain inactive until separately approved.

## M3. Authoritative projections and cutover protocol

**Owner:** Backend Implementer; Data/Billing Implementer reviews projection invariants. **Dependencies:** M2.

- Implement synthetic source adapters for Company/Branch/student lifecycle, demo classification, official learning results, and acquisition conversion
- Implement school-scoped canonical billing subjects and effective-dated source aliases, with ownership checks and auditable mapping corrections
- Apply aggregate versions in order, defer gaps/parents, quarantine conflicts, and commit projection/checkpoint updates atomically
- Specify and test source snapshot/barrier manifests, cutover, replay, tombstones/deletion coverage, and reconciliation after outage
- Cover imports, delete/recreate, archive/restore, branch transfer, branch/company cascades, and multiple-school learner identity
- Prove branch transfers and duplicate aliases cannot double school-level billable quantity
- Prove unknown source completeness blocks invoice close. Do not substitute local inbox continuity or an outbox maximum for a source barrier

**Exit:** deterministic rebuild and failure-recovery tests pass against PostgreSQL with synthetic source data. A separate integration task must later prove source transaction/outbox atomicity in the operational system.

## M4. Analytics queries and dashboard vertical slices

**Owners:** Backend and Frontend Implementers in parallel under frozen contracts; UX owns the design specification. **Dependencies:** M2; authoritative metrics depend on M3.

- Build acquisition, traffic, ordered funnels, live activity, usage, and learning queries with explicit units/definitions and bounded indexed reads
- Version first/last-touch attribution, conversion windows, exclusions, and unknown-link behavior. Prove replay and recomputation do not duplicate goals
- Return coverage/freshness/checkpoints. Test oldest-input freshness, unavailable source, mixed currencies, timezone boundaries, and true zero
- Implement URL filters, query-key isolation, superseded-request handling, school/branch consistency, live cursor recovery, and all required UI states
- Inspect actual screens at target widths and keyboard-only paths. Give charts understandable legends, units, comparisons, and accessible summaries

**Exit:** Tester records candidate-bound PASS for applicable UX-B01–UX-B08, A11Y-01–A11Y-10, and UX-R01 in [UI/UX requirements](ui-ux-requirements.md). UX-U01 participant evidence establishes period/scope/freshness comprehension before the corresponding launch-usability gate closes; missing participant evidence stays NOT RUN/BLOCKED.

## M5. Contracts, invoice preview, and immutable close

**Owner:** Data/Billing Implementer as sole financial-schema/calculation writer, with Backend and Frontend consuming approved contracts. **Dependencies:** M3, confirmed calculation examples for exercised policies.

- Model stable obligation/period identities, append-only contract/policy revisions, conflict detection, and overlap rules
- Keep policy/contract activation draft until decisions and actor authorization are complete. Implement the activation transition only after its contract is approved
- Freeze synthetic expected-result examples for 31-day and leap-year periods, same-day changes, suspended status, branch transfer, rate revision, annual anchors, cancellation, and residual allocation
- Use exact rational calculations and integer money. Reconcile school totals, branch breakdowns, subject lines, and fixed-plan management allocations
- Build non-posting preview with completeness blockers and canonical hash. Recompute under concurrency control during close
- Enforce one original close per stable obligation/period and immutable closed facts at the database level
- Test stale preview, concurrent closes, changed-key attempts, source changes during close, rollback, commit-response loss, and transaction retry

**Exit:** configurable/synthetic calculations are evidence-backed, closed facts cannot be modified, and unsafe source/policy states fail closed. Synthetic correctness does not authorize issuing real invoices.

## M6. Receipts, corrections, overdue, and reminders

**Owner:** Data/Billing Implementer; Frontend owns interaction flows. **Dependencies:** M5 and approved correction/activation contracts.

- Implement manual receipts, partial/multi-invoice allocation, available credit, and proposed full-receipt reversal under transaction locks and idempotency
- Implement invoice corrections only after their separate adjustment/credit/void rules are agreed; payment reversal is not a substitute
- Add the proposed server-issued reversal preview and actor/company/payment/operation-bound consequence hash plus ledger revision. Revalidate under the transaction guard; stale or expired reviewed consequences require a new preview and explicit confirmation
- Test over-allocation, concurrent allocation/reversal, reversal after later allocation, changes between reversal confirmation and submit, wrong-actor/company or expired previews, exact replay after successful reversal advances the revision, cross-school/currency rejection, duplicate references, and lost responses
- Display billed, collected, outstanding, credit, and normalized recurring revenue separately
- Implement in-app overdue calculation, acknowledgment, and durable deduplication, including timezone boundaries, paid invoices, correction effects, and reversal reopening
- Verify there is no service-suspension/login-blocking path and that outbound channels remain disabled

**Exit:** ledger invariants and recovery tests pass; Tester records exact-candidate PASS for affected UI criteria. UX-U02 and UX-U03 participant evidence in [UI/UX requirements](ui-ux-requirements.md) establishes financial comprehension and safe unknown-outcome recovery before the corresponding launch-usability gate closes. Financial activation and outbound messages still require distinct approval gates.

## M7. Source integrations and controlled live cutover

**Owner:** Coordinator assigns separately authorized integration writers. **Dependencies:** M2–M6 as applicable, explicit source-repository scope and live-integration approval.

- Reinspect the current source repositories; historical descriptions are not current-code evidence
- Implement source-side transactional outbox, aggregate ordering, stable subject identity, durable acquisition capture, verified links, auth exchange, and barrier production as separate reviewed changes
- Keep the source persistence stack and ownership checks intact. Prove source rollback emits no event
- Integrate the tracker one surface at a time under the approved privacy policy; avoid duplicate old/new tracking during cutover
- Verify real producer/consumer contract compatibility using safe synthetic end-to-end records before live collection
- Use schema → compatible consumer → producer → frontend rollout, with feature gates and documented lag/barrier readiness
- Document partial failures and safe rollback. Pause close when rollback or missing evidence makes source completeness uncertain; never roll back immutable ledger facts destructively

**Exit:** scoped integrations and live activation are individually verified. Publishing analytics code does not establish that these changes or permissions exist.

## M8. Operational readiness and final verification

**Owner:** Release Integrator; Tester executes independent checks; both reviewers reassess every new candidate/review key. **Dependencies:** relevant implemented milestones.

- Test fresh migrations, forward compatibility, worker restart, database outage readiness, replay, nonproduction backup restore, and recovery after partial deployment
- Complete privacy inventory and approved retention/anonymization rules before enabling deletion or live collection
- Run realistic bounded load and concurrent dashboard reads, reporting machine/database resources, admitted unique events, latency, queue lag, storage growth, and zero-loss evidence for acknowledged events
- Treat 50 schools, 50,000 students, and 10 million events/month as design targets only. Ten million events per 30 days averages about 3.86 events/second; explicitly test bursts rather than claiming the average is peak capacity
- A proposed engineering exercise is 100 admitted events/second for 30 minutes with an interrupted worker and concurrent queries; approve/revise the test budget and acceptance thresholds before using it as a capacity claim
- Run final lint, typecheck, unit, PostgreSQL integration/concurrency, browser E2E, production build, migration, dependency, and module-boundary checks on the exact combined revision
- Require Tester PASS on the exact implemented product-facing candidate before delivery; unmet or unverified mandatory criteria are BLOCKED. Post-publication smoke checks are additional, not a replacement
- Verify final remote commit/CI only when publication is authorized. Merge and deployment remain separate actions

**Exit:** report passed, failed, and never-run checks separately, link review evidence, list unresolved risks, and distinguish deployable code from a verified running service.

## Required test layers

| Layer | Establishes | Does not establish |
| --- | --- | --- |
| Pure unit fixtures | Domain rules, exact arithmetic, boundary dates | SQL constraints, locks, or durability |
| Contract tests | DTO/schema compatibility and error semantics | End-to-end authorization by themselves |
| PostgreSQL integration | Constraints, transactions, rollback, replay, concurrency | Correct rendering or keyboard interaction |
| Browser E2E | Real UI/API paths, interruption/repetition, filters, accessibility behavior | Production capacity or legal/business approval |
| Operational exercises | Restore/recovery, migration, rollout, measured performance | Approval to collect or send real data |

No role may mark a milestone complete solely because its documentation or scaffolding exists. Completion requires the stated evidence and closure of its blocking review gates.
