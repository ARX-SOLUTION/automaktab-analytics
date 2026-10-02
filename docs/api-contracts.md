# API and workflow contracts

**Design only.** Route names and DTOs below are proposed contracts. They are not available endpoints. Agree and version their schemas before parallel frontend/backend implementation.

## Shared transport rules

Founder routes use `/api/v1`, public collection uses `/collect/v1`, and trusted service collection uses `/internal/v1`. Every protected read and write, including a repeated command, verifies the current session and resource authorization. Mutation routes validate CSRF/origin as appropriate. Rate limits and size/query-window limits are server-enforced.

Use camelCase for HTTP DTOs. Event envelopes retain snake_case fields and an independent `schema_version`. IDs are opaque strings. UTC instants use ISO 8601 with an explicit offset; business dates use `YYYY-MM-DD` with an explicit IANA business timezone. Query intervals are closed-open `[from, to)`.

Money is `{ currency, minor }`, where `minor` is a decimal integer string. Currency scale is confirmed on the server. Reject malformed/negative receipt amounts, unsupported currencies, extra command fields, invalid dates, and cross-currency allocations. Do not serialize native `bigint` or floating-point money. Stable cursor pagination needs deterministic ordering and an ID tie-breaker.

Successful responses contain `data` plus `meta: { requestId, apiVersion, replayed? }`. Errors contain `error: { code, message, retryable, details? }` and the same request metadata. Details may contain safe field errors and blocker IDs, never raw SQL, secret payloads, contact fields, or stack traces. Generate OpenAPI from the runtime-validated contract and test clients against it.

Adding a compatible optional response field is different from changing a field's meaning or unit. Breaking HTTP changes require a new major API contract. Event schema changes have their own version policy. Unknown trusted versions are quarantined and block affected completeness rather than being discarded as harmless telemetry.

## 1. Founder session

The product serves the internal founder/authorized team. The routes below describe a proposed least-privilege founder bootstrap; exact team role grants remain unresolved. Documentation grants no identity access.

- `POST /auth/session`: proposed `{ exchangeCode, state }`
- `GET /auth/session`: safe metadata for the authenticated founder
- `DELETE /auth/session`: revoke the dedicated session

The exchange must be short-lived, one-time, audience-bound, and associated with the browser's verified state. The source adapter validates the exact approved founder subject and rejects impersonation. These capabilities must be implemented and tested; their mention is not evidence that a source provider already supports them.

Missing configuration fails closed with `AUTH_NOT_CONFIGURED`. Wrong state/audience, expired code, replay, valid non-founder, forged subject, expired session, revoke, and provider outage each need tests. If a one-time exchange response is lost, restart a fresh handoff rather than making the code reusable. Expiry clears protected UI caches and closes live streams. Logout revokes before reporting success.

## 2. Event admission

- Public: `POST /collect/v1/events`
- Trusted source: `POST /internal/v1/events`
- Batch shape: `{ events: EventEnvelopeV1[] }`

Every envelope has `event_id`, `schema_version`, `name`, `occurred_at`, `source`, `environment`, and allowlisted `properties`. Public events may include anonymous/session identifiers. Authenticated identity requires backend proof. Trusted lifecycle envelopes additionally carry aggregate type/ID/version, school ownership, effective time, and provenance. Large versions use decimal strings rather than unsafe JavaScript numbers.

Validate each route's trust boundary, schema, payload size, timestamp range, source/environment, and category allowlist. Public payment/lifecycle/official-outcome claims are rejected. Raw school, branch, or subject fields cannot establish ownership. Privacy filtering applies before durable admission.

Return `202` only after the accepted payloads and admission receipt are durable, with `receiptId` and per-event `{ eventId, status: accepted|duplicate|rejected, code? }`. Accepted means stored, not projected. Same source/environment/event ID and identical content is a duplicate. Different content with the same identity is `EVENT_ID_CONFLICT`. Invalid framing rejects the batch; item rejection is explicit. Storage failure must not return a success receipt.

Retry uncertain deliveries with the original event IDs. Respect `Retry-After`; do not retry a permanently invalid public payload indefinitely. Quarantine authoritative rejected events and surface them as projection blockers. Tracker failure never breaks product sign-in, navigation, or core workflows.

## 3. Acquisition and school facts

The source integration must durably capture platform acquisition leads before reporting success, return a stable opaque lead ID, and emit its event from the same transaction. Any notification happens after persistence through a retriable channel. Analytics does not store raw lead contact fields.

An authorized source command explicitly links the lead to a real Company. Anonymous identity linkage requires proof; public `identify` cannot make that link. Missing links remain unknown in the UI. Company creation and acquisition conversion are distinct from a school's own student-lead pipeline.

School queries:

- `GET /schools` and `GET /schools/:id`
- `GET /schools/:id/billing-subjects`
- `GET /system/data-status` for source gaps, barriers, freshness, and quarantined dependencies

Lifecycle edits remain in the source system. Cover create/import, activity changes, completion, drop, archive/delete, restore, branch transfer, company/branch cascades, and demo classification. Projection updates and checkpoints are atomic. The close-readiness contract requires an authoritative source barrier and explicit cutover; it cannot infer earlier history from today's active count.

## 4. Dashboard query contract

Queries include `GET /overview`, `/traffic/summary`, `/traffic/sources`, `/acquisition/funnel`, `/usage/summary`, and `/learning/summary`. Funnel routes are `GET /funnels`, `GET /funnels/:id/results`, `POST /funnels`, and `POST /funnels/:id/revisions`.

Shared filter DTO: `{ from, to, timezone, companyId?, branchId?, surface?, environment }`. Validate timezone/range and that the selected branch belongs to the selected school. Surface names distinguish marketing, tenant app, school learning, and practice. Bot/demo exclusions are server-defined and included in the metric definition.

Return metric units and definition versions plus `generatedAt`, `dataThrough`, `projectionCheckpoint`, `coverageFrom`, `status: fresh|stale|partial`, and `warnings[]`. Freshness is per contributing dataset; composite results expose their oldest required boundary and gaps. Return separate currency totals unless an explicit conversion contract exists.

React query keys include all normalized filters and definition versions. Cancel superseded requests or ignore results for inactive keys. School changes clear incompatible branches. Never place old-filter data beneath new-filter labels. True zero, unknown, unavailable, and partial values have different presentation.

Live activity uses `GET /live/snapshot` and `GET /live/stream`. Load a snapshot/cursor, then subscribe to founder-authenticated SSE. Reconnect using the last sequence ID and deduplicate replays. An expired cursor triggers a reset and fresh snapshot. An expired session closes the stream.

## 5. Contract revisions and policy activation

- `GET /billing/contracts`, `GET /billing/contracts/:id`
- `POST /billing/contracts`
- `POST /billing/contracts/:id/revisions`
- `GET /billing/policy-status`

Proposed revision input: `{ companyId, planType, effectiveFrom, effectiveTo?, currency, amountMinor, businessTimezone, policyRevisionId, expectedRevision? }`. `planType` distinguishes fixed monthly, fixed annual, and monthly active-student. Expose whether the amount is a fixed-period price or a per-active-student monthly price. Every school needs an explicit rate and effective dates. Revisions append, reject stale writes with `CONTRACT_REVISION_CONFLICT`, and must not create overlapping effective coverage for the same obligation.

Policy and contract activation require an actual state-changing use case with actor, audit, idempotency, and validation of all required decisions. A read-only policy-status endpoint is insufficient. The exact activation route and approval representation are unresolved until the product decision is recorded. Keep contracts draft and return `BILLING_POLICY_UNCONFIRMED` when activation prerequisites are absent.

Contract revisions do not reprice closed invoices. Stable obligation/period identity must survive revisions. Mid-period rate changes, cancellation, annual anchors, and financial correction rules must be settled before enabling those operations.

## 6. Preview and immutable close

- `POST /billing/contracts/:id/previews`: `{ periodStart, periodEnd }`
- `POST /billing/contracts/:id/closes`: `{ periodStart, periodEnd, expectedPreviewHash }` plus `Idempotency-Key`
- `GET /billing/invoices`, `GET /billing/invoices/:id`

Preview returns contract/policy/calculation revisions, stable obligation and period IDs, currency, source barrier/checkpoint, lines, totals, `previewHash`, `canClose`, and `blockers`. Lines identify opaque canonical subjects, eligible intervals, branch allocation, and the calculation basis. A preview creates no receivable.

The server intersects authoritative lifecycle and contract intervals, deduplicates aliases, computes exact rational proration, and applies the confirmed rounding/allocation policy. Source gaps, unknown barriers, unresolved aliases, ownership mismatches, missing policy, or incomplete coverage block close.

Canonical hashing includes every consequential input, calculation version, policy/contract revisions, period/currency, barrier/checkpoint, lines, allocations, and totals. Exclude volatile display timestamps. Store the hash algorithm/version.

Close locks the relevant company/obligation, obtains a consistent complete projection snapshot, recalculates, and compares the expected hash. Changed inputs return `PREVIEW_STALE`; incomplete source returns `SOURCE_NOT_READY`. Neither posts an invoice. The client does not submit authoritative totals.

Enforce one original close per stable obligation/period in the database, independent of the idempotency key or revision used. Repeating the same already-closed result returns that invoice. A conflicting attempt returns `PERIOD_ALREADY_CLOSED` with its ID. Freeze the invoice, due date, lines, source/policy provenance, and hash; database protections reject modification/deletion of closed facts.

After a timeout, retry the same key/body. A changed preview requires explicit user review and a new intent. A refreshed result must never be auto-accepted merely because a transient retry occurred.

## 7. Manual receipts, allocations, and reversals

- `GET /billing/payments`, `GET /billing/payments/:id`
- `POST /billing/payments`
- `POST /billing/payments/:id/allocations`
- `POST /billing/payments/:id/reversal-previews`
- `POST /billing/payments/:id/reversals`

Receipt input: `{ companyId, amount: Money, receivedAt, method, reference?, allocations: [{ invoiceId, amountMinor }] }`. Validate positive money, allowed dates/methods, company/currency match, eligible closed invoices, and bounded safe references. Never accept card/bank credentials.

Within the transaction, lock and re-read receipt/invoice balances. Active allocations cannot exceed the receipt's unreversed value or an invoice's eligible outstanding amount. A partial payment leaves an open balance. Excess becomes explicit unallocated company/currency credit. Later allocation uses the same constraints and idempotency contract.

Return committed `{ paymentId, amount, allocatedMinor, unallocatedMinor, allocations, affectedInvoiceBalances }`. The UI does not optimistically mark an invoice paid. Separate billed value, collected cash, outstanding, available credit, and normalized recurring revenue; annual upfront cash is not a single month's recurring revenue.

The proposed v1 receipt reversal is full-receipt only and requires a reason plus explicit UI confirmation. Partial receipts are supported; partial cash reversal is a separate future contract.

**Reversal review contract:** `POST /billing/payments/:id/reversal-previews` accepts `{ reason }` and returns a non-posting server-issued preview with `previewId`, `ledgerRevision`, `previewHash`, `expiresAt`, `canReverse`, `blockers`, and the exact consequences: receipt amount/currency, active allocations to reverse, available credit to remove, and each affected invoice's resulting balance. Bind the preview server-side to the payment, company/tenant, currently authorized actor, operation `fullReceiptReversal`, reason, and calculation/contract version. Canonically hash those bindings and all reviewed consequences. A digest is not an authorization credential. This endpoint and revision mechanism are proposed implementation work, not existing capabilities.

Reversal submission is `{ reason, previewId, expectedLedgerRevision, expectedReversalPreviewHash }` plus `Idempotency-Key`. After authorization, use the company/ledger transaction guard and required record locks to validate the binding, expiry, and current ledger revision, then recompute and compare the reviewed consequences. The revision must change for every intervening write that can alter these consequences, including later allocation of this receipt and changes to affected invoice balances from other receipts or corrections. `409 REVERSAL_PREVIEW_STALE` rejects any expired or changed review with no reversal committed. The client must fetch a new preview and obtain a new explicit confirmation; it must not silently reverse newly added allocations or changed balances.

Only after this validation, atomically append the reversal and compensating entries for all still-active allocations, remove its available credit, reopen eligible invoice balances, and commit audit/outbox/command receipt. Preserve originals and enforce one reversal per receipt independently of preview or idempotency key.

Idempotency hashes the full validated submission, including the expected revision and preview identity/hash. For an already committed same-key/same-body command, reauthorize and return its original committed result without reapplying the reversal or rejecting merely because that successful reversal changed the ledger revision. A same-key/different-body request conflicts. For an uncommitted command, all current preview/revision checks still apply. After stale rejection, a newly reviewed preview is a deliberate new intent/key. The UI distinguishes a replayed original result from a fresh balance query. Test that concurrent same-key attempts cannot bypass validation or execute twice.

`ALLOCATION_CONFLICT` requires reloading balances and reviewing a new intent; do not silently reduce or move allocations. Idempotency prevents repeated submission of the same intent, not every real-world duplicate receipt entered as a separate intent. Reliable external references can support duplicate detection; ambiguous matches are flagged for review.

## 8. Invoice corrections

Invoice adjustment/credit/void operations need a separate approved contract before implementation or activation. Define eligible invoice states, paid/unpaid behavior, tax/accounting assumptions if relevant, resulting balance/credit treatment, reasons, audit, and authorization. Preserve the original invoice and link all corrections.

A receipt reversal does not satisfy this requirement. Do not implement a generic editable invoice or a destructive “reset” as a shortcut. The correction review gate stays open until command contracts, exact balance examples, concurrency tests, and permission rules are agreed.

## 9. Overdue and reminders

- `GET /reminders`
- `POST /reminders/:id/acknowledgments`
- `GET /audit` for authorized provenance inspection

Only eligible invoices with positive outstanding balance can be overdue. Use stored due dates and the contract's business timezone; viewer timezone is display-only. Under the confirmed convention, the due date itself is not a full day overdue. Paid/invalidated invoices disappear from overdue results; a reversal may restore an overdue balance.

Persist a deduplication key containing invoice, notice type, relevant balance/due-state revision, and configured time bucket. Repeated jobs must not duplicate notices. Acknowledgment means viewed, not paid. Recover from current ledger state after outages instead of replaying every historical notification.

Initial delivery is in-app. Email or messaging delivery needs approved recipients, information category, channel, and cadence before enabling. No reminder command may suspend a school or block service.

## 10. Error and retry behavior

| Code / class | Guaranteed behavior | Client recovery |
| --- | --- | --- |
| `400 INVALID_REQUEST` | No command committed | Correct field errors before resubmission |
| `401 SESSION_EXPIRED` | No protected result disclosed | Clear protected caches and restart sign-in |
| `403 FOUNDER_REQUIRED` / `CSRF_FAILED` | No protected mutation | Stop automatic retries; repair access/session state |
| `404 RESOURCE_NOT_FOUND` | No unauthorized existence disclosure | Reload the permitted parent list |
| `409 IDEMPOTENCY_CONFLICT` | Original result preserved | Reconcile the original intent; do not overwrite its key |
| `409 COMMAND_IN_PROGRESS` | No second execution | Back off and repeat identical key/body |
| `409 PREVIEW_STALE` / `REVERSAL_PREVIEW_STALE` / `ALLOCATION_CONFLICT` | No stale financial mutation | Refresh and obtain a new review |
| `409 SOURCE_NOT_READY` | No close posted | Show blockers and wait for source recovery |
| `422 BILLING_POLICY_UNCONFIRMED` | No financial activation | Complete and record required decisions |
| `429 RATE_LIMITED` | Admission outcome is explicit or uncommitted | Respect `Retry-After`, preserving IDs/keys |
| `503` / disconnected response | The client may not know whether commit occurred | Retry only through the original idempotent intent |

Use explicit `retryable` metadata rather than status alone. GET retries are bounded. Financial retries preserve body and key, reauthorize, and never convert changed business inputs into an implicit approval.

## Transactional acceptance cases

Test crash before commit, crash after commit before response, concurrent same-key requests, changed-payload reuse, new-key duplicate obligation, deadlock/serialization retry, stale preview, concurrent source update, receipt over-allocation, reversal after later allocation, allocation or invoice-balance change between reversal confirmation and submit, expired/wrong-actor/wrong-company reversal previews, exact replay after the reversal itself advances the ledger revision, and session expiry during replay against PostgreSQL. An in-memory unit mock cannot establish database concurrency or durability guarantees.
