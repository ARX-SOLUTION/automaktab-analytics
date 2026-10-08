# Decision and acceptance register

## How to use this register

The 14 review gaps below are carried forward as open acceptance gates. These documents clarify the required contract; they do not demonstrate that a gap has been fixed in code. Assign a concrete owner at task start and record the decision, evidence, reviewed candidate, remaining risk, and status for each gate.

The table preserves the original review baseline. Decisions approved on8 October2026 and current implementation/check results are recorded in the [specification addendum](specs/2026-10-05-analytics-design.md#product-owner-decisions-and-execution-authorization--8-october-2026) and [execution checkpoint](implementation-execution-plan.md#current-verification-checkpoint--8-october-2026). Neither those decisions nor component passes close an exact-candidate acceptance gate.

Use statuses such as open, decision recorded, implemented awaiting evidence, blocked, and verified closed. “Reviewed” alone is not a closure state. A decision can unblock synthetic implementation without authorizing live activation. All technical closure claims must refer to the exact candidate and actual test result.

## 14 carried-forward review gates

| ID | Gap and accountable role | Required decision or implementation | Acceptance evidence | Current state |
| --- | --- | --- | --- | --- |
| G01 | Repository/baseline — Coordinator | Recheck visibility, current branch/commit, existing files, write target, and public-data limits before changes | Current repository evidence; preserved existing work; exact candidate | Historical public/empty baseline verified; recheck required at execution/publication |
| G02 | Multi-repository scope — Coordinator | Bound edit/push/PR/migration/merge/activation separately for every repository | Explicit scope record; synthetic adapters where source edits are not authorized | Open; this package grants no external write or activation permission |
| G03 | Latest TypeScript compatibility — Release Integrator | Verify exact stable TypeScript, Nest DI/decorators/module format, Drizzle, React/Vite, lint, and test peers | Reproducible lockfile, clean install, API/UI boot, typecheck/build/test results | Open; no compatibility spike run |
| G04 | Snapshot/source barrier — Architect + Backend | Consistent source manifest, aggregate heads, tombstones, cutover/replay, dependencies, and close-readiness proof | Lost/late/duplicate/out-of-order/restart scenarios block unsafe close and recover deterministically | Designed; implementation and evidence pending |
| G05 | Invoice correction — Data/Billing | Separate adjustment, credit, void, paid/unpaid balance behavior, audit, and permissions from receipt reversal | Exact ledger examples and concurrency/replay tests; frozen originals preserved | Open decision; no correction shortcut authorized |
| G06 | Contract/period identity — Data/Billing | Stable obligation/period IDs, revisions, overlap, mid-period rate change, cancellation, annual anchor, concurrent edit | Same-period/new-key/new-revision cannot double invoice; stale edits fail; exact boundary fixtures | Partly designed; business rules and tests pending |
| G07 | Active day/rounding — Data/Billing + product decision owner | Same-day activity/transfer, interval boundaries, proration denominator, rounding stage, residual allocation | Approved synthetic fixtures with exact expected days and minor-unit totals | Open decision; no live defaults |
| G08 | Durable billing subject — Architect + Backend | Authoritative school-scoped identity and effective aliases for recreate/import/merge, with audit | Same phone remains separate; verified recreate bills once; deletion preserves history; branch move does not double bill | Designed; source contract and tests pending |
| G09 | Auth/identity — Backend + Security/Data Reviewer | Approved bootstrap principal, team grants, handoff state/audience/expiry/single use/revoke, outage behavior | Wrong state/audience, replay, impersonation, non-granted account, cross-school ownership, expiry and outage tests | Least-privilege bootstrap proposed; identities/grants unconfirmed |
| G10 | Late events/rebuild — Backend | Event versus ingest time, recomputation windows, late identity links, post-TTL handling, definition versions | Deterministic rebuild; replay/late linking cannot double counts or rewrite closed invoices | Open detailed policy and executable evidence |
| G11 | Deploy/rollback — Release Integrator | Schema → compatible consumer → producer → frontend, flags, lag/barriers, outbox retention, financial safety during rollback | Partial-failure matrix, restore/replay exercise, compatibility results, close disabled when evidence is uncertain | Open; no deploy/rollback configuration or exercise completed |
| G12 | Privacy across stores — Security/Data Reviewer | Inventory browser/offline queues, visitors/aliases/attribution, inboxes, rollups, logs, receipts, exports, and backups | Approved purpose/access/retention/anonymization rules; financial evidence segregated; no unapproved collection/deletion | Open; no retention enforcement activated |
| G13 | Policy/contract activation — Data/Billing + product decision owner | Draft → confirmed → active command with actor, authorization, audit, idempotency, complete policy/rate inputs | Unauthorized/incomplete/stale/concurrent/replayed transitions tested; read-only status endpoint cannot activate | Open decision and workflow contract |
| G14 | Single design version — UX | One dark/slate/tech-blue and DM Sans token/asset manifest; explicit replacement of the earlier light direction; licensed assets | Manifest version, criterion-ID evidence, exact-candidate Tester PASS, and required participant tasks from UI/UX requirements | Direction confirmed; assets, implementation and visual evidence pending |

## Business decisions that cannot be guessed

Record decisions per policy revision and, where relevant, per school contract:

- Currency and minor-unit scale; no silent assumption of one national currency
- Business timezone and the distinction from dashboard display timezone
- Billable-day definition, same-day activity/transfer convention, and proration denominator
- Suspended-student treatment; confirmed exclusions include completed, dropped, archived/deleted, and demo students
- Rounding stage, line/branch residual allocation, and invoice reconciliation rules
- Due-date convention and overdue day calculation
- Fixed annual anchor and missing-calendar-date/leap-year treatment
- Mid-period rate change, overlap, cancellation, and stable obligation/period identity
- Adjustment/credit/void behavior for paid and unpaid invoices, including any resulting credit
- Exact school rate and effective dates, without an invented global rate
- Authorized policy confirmation/activation actor, transition rules, and audit representation

Examples and synthetic tests can explore alternatives, but must label their assumed policy and cannot activate a real contract. Once a decision is approved, freeze exact fixtures and link the resulting policy revision to every affected financial calculation.

## Access and rollout decisions

The confirmed product is an internal Automaktab founder/team tool, not a school-facing portal. The least-privilege bootstrap proposal admits only an explicitly confirmed founder identity until team roles and exact grants are approved. Documentation activates neither identity nor access. Never infer grants from an operational developer role or school ownership.

Before live integration, settle the source repositories in scope, auth provider/subject, service credentials through a secure process, source cutover/barrier contract, tracking/consent policy, practice surface rollout, and retention. Outbound reminders require approved recipients, channel, information category, and cadence. In-app reminders do not imply permission to send messages.

## Exact financial fixture contract

Before implementing each calculation policy, provide synthetic fixtures with:

1. A named policy revision and stable obligation/period
2. Currency/scale, business timezone, school price, and effective dates
3. Source barrier/coverage and canonical subject/alias timeline
4. Every status/branch/contract change with effective time and version
5. Exact expected eligible intervals/days, rational amounts, rounding/residual allocation, and totals
6. Expected invoice/receipt/credit balances before and after each operation
7. Expected error/blocker for incomplete, conflicting, stale, or unauthorized inputs

At minimum cover a 31-day month with partial activity, leap-year February, activation/deactivation on the same date, branch transfer, overlap, annual anniversary edge, cancellation, correction after payment, partial receipt, overpayment credit, and reversal after later allocation. Fixture amounts are synthetic, never actual customer information.

## Cross-cutting release blockers

Do not close a milestone or activate dependent behavior while any of these applies:

- An auth/ownership/privacy boundary fails or cannot be verified
- Billing policy, canonical subject identity, contract coverage, or source completeness is unknown
- Financial commands lack durable idempotency, business uniqueness, or concurrency evidence
- Closed facts are editable, destructive corrections are used, or receipt reversal substitutes for invoice correction
- The UI misstates zero/freshness/currency, hides a material blocker, or silently accepts changed financial inputs, including reversal allocations/credit/balances that changed after confirmation
- Reversal lacks a server-issued actor/company/payment/operation-bound preview and expected ledger revision/hash validated under the transaction guard, stale-consequence rejection, reconfirmation, or exact committed replay evidence
- Required fresh inspection-only reviewers have not independently approved the same exact candidate/evidence digest, or a candidate/review-key change invalidated approvals
- Final integration, even if mechanical, lacks both independent reviews and separate verification-only QA evidence
- Final integrated checks are missing, failed, or only asserted without evidence
- Mandatory UI/accessibility criteria or the agreed browser/assistive-technology matrix are unmet/unverified; implemented product-facing changes lack pre-delivery exact-candidate Tester PASS
- The relevant launch-usability gate lacks UX-U01/UX-U02/UX-U03 participant evidence; expert walkthroughs do not replace it
- Publication/deployment/live data/credentials/outbound delivery exceeds the approved scope

Any candidate or review-key change invalidates both independent approvals. Both reviewers must reassess the new snapshot, with a documented scoped/no-impact reassessment allowed when justified. Tester and Adviser remain additional roles and cannot waive these gates.

## Verification report format

For each milestone, record the repository and candidate, exact commands, environment and fixture versions, result as passed/failed/not run, artifact location, both reviewer outcomes, Tester result, Adviser risks, and remaining decisions. Do not attach real customer records or secret-bearing logs. A documentation review proves only document quality; it does not prove code, database, browser, CI, or production behavior.
