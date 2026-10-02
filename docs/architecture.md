# Architecture and invariants

## Status and scope

This is an implementation design. Modules, tables, jobs, and adapters described here are proposed, not existing application capabilities. The target is a self-hosted internal founder/team dashboard with platform subscription billing. Begin with synthetic source events and fixtures; live connections are gated separately.

The initial analytics surfaces are marketing, the tenant application, and student learning. Keep practice activity separately labeled; its live rollout scope remains a product decision. The proposed least-privilege bootstrap admits only an explicitly confirmed founder identity until team roles and exact grants are approved. The internal founder/team audience is confirmed; founder-only bootstrap is a security proposal, not a replacement for that audience. Documentation activates neither identities nor access. Do not grant access to every operational developer or school owner.

## System shape

Use a pnpm monorepo with `apps/web`, `apps/api`, `packages/contracts`, and `packages/tracker`. Start with a modular NestJS API, one separately runnable worker process, and a dedicated PostgreSQL database. Share application/domain packages where useful without requiring a microservice network.

The browser tracker sends privacy-filtered telemetry to a public collector. A durable inbox feeds traffic and usage projections. An authenticated source adapter supplies authoritative school, identity, acquisition, and learning facts to a separate trusted collector. Financial commands are admitted only through founder-authorized application services.

The operational CRM remains authoritative for its business records and retains its own persistence stack. This application uses Drizzle and must not replace the CRM's ORM or write directly into its database. The eventual source adapter must write each business mutation and outbox event atomically in the source transaction. That adapter is separate work until its repository scope is approved.

## Ownership

| Module | Owns | Must not do |
| --- | --- | --- |
| `auth` | Dedicated analytics sessions, founder authorization, provider adapter | Treat a general operational role as founder authority |
| `collection` | Schema/privacy validation, immutable admitted envelopes, receipts, deduplication | Trust a browser claim about money, ownership, lifecycle, or official outcomes |
| `identity` | Verified opaque identity links and sanitized acquisition attribution | Merge people by phone/name or accept an unproved company link |
| `schools` | School/branch read models, effective lifecycle intervals, subject aliases, source checkpoints | Change source CRM records or fabricate historical active days |
| `traffic` / `usage` | Traffic and product activity projections | Present browser-observed activity as an authoritative business outcome |
| `learning` | Trusted learning-result projections, separately segmented practice | Treat a browser completion event as an official result |
| `funnels` | Versioned goal definitions, ordered conversion windows | Change metric meaning without a definition revision |
| `live` | Bounded authenticated activity snapshot and stream | Promise an unbounded durable message history |
| `billing` | Contract revisions, policy revisions, invoices, cash receipts, allocations, corrections | Import student tuition as platform revenue or charge a bank account |
| `reminders` | In-app overdue notices and acknowledgments | Suspend schools, block access, or enable unapproved outbound delivery |
| `audit` | Append-only administrative and financial provenance | Log secrets or unnecessary personal data |

Controllers handle transport validation. Named application services coordinate a use case. Domain functions perform deterministic calculations without importing NestJS or Drizzle. Infrastructure adapters implement real boundaries such as the source auth provider, clock, transaction, and repository. Avoid generic abstractions for every helper. Nest modules export only their intended public providers.

## Trust and identity

Use distinct route families and independently tested guards:

- `/collect/v1`: public, untrusted telemetry admission
- `/internal/v1`: authenticated, source-scoped service admission
- `/api/v1`: founder-authorized dashboard queries and commands

Prefixes do not create security. No browser-facing route may promote an event to trusted. A service credential must be bound to its producer and environment; an Origin header is not identity proof. Credentials are configured through an approved secure process and never embedded in the tracker.

School identity is the authoritative `Company.id`. Branches, students, and events must retain school ownership. A canonical `billing_subject_id` is school-scoped; effective-dated aliases connect source student records to it. A deletion/recreation or import needs authoritative continuity or an audited, explicitly reviewed alias decision. A global learner account may belong to more than one school and does not merge their obligations. Matching phone numbers do not establish continuity.

Founder authentication is a proposed short-lived, one-time source-authenticated exchange bound to the analytics audience and browser state. Exact provider setup and subject remain gated. Reject impersonation, expired/replayed exchanges, wrong state/audience, and non-founder users. Use revocable host-only Secure HttpOnly sessions, deliberate SameSite behavior, and CSRF/origin protection on mutations. Fail closed when auth configuration or the provider is unavailable. Never reuse an operational application's signing secret.

## Source ordering and completeness

Every trusted lifecycle envelope needs immutable source/event identity, aggregate identity and version, school ownership, occurrence and effective times, schema version, environment, and provenance. Allocate aggregate versions under a source transaction lock. At the consumer, apply version `n + 1` only after `n`; defer gaps and missing parents, deduplicate identical repeats, and quarantine conflicting content.

Commit projected intervals and their checkpoint together. Sequence order and business effective time are different: a late correction can change an open-period timeline without regressing the current source state.

Before invoice close, require a source-issued consistent snapshot/barrier containing relevant aggregate heads, cutover/as-of boundary, and a content hash. Prove that all required heads and dependencies are applied. A locally gap-free inbox or maximum auto-increment outbox ID cannot establish completeness; allocation and commit order may differ. Missing barriers, gaps, unresolved aliases, and ownership errors block close.

A clean start can seed known current state at a declared cutover. It cannot invent earlier active days or import historical analytics/financial records by assumption. Source reconciliation must state its cutover, provenance, and affected projections. Later authoritative changes affecting closed periods require explicit append-only corrections.

## Financial model

- **Contract obligation:** a stable school subscription obligation independent of individual revisions
- **Contract revision:** append-only effective plan, school-specific rate, currency, timezone, and linked policy revision
- **Billing period:** a stable obligation/period identity under a confirmed schedule, shared across revisions so splitting a period cannot create duplicate original invoices
- **Policy revision:** explicit approved currency scale, day rules, rounding, suspended treatment, due dates, anniversary handling, and activation provenance
- **Invoice snapshot:** immutable closed facts, lines, source barrier/checkpoint, calculation version, contract/policy revisions, due date, allocations, and content hash
- **Cash receipt:** bookkeeping for money already received, with a positive amount and company/currency identity
- **Payment allocation:** attribution of available receipt value to eligible closed invoice balances
- **Correction/reversal:** append-only linked records preserving the original facts and reason

Store money as integer minor units; API amounts are decimal integer strings with an explicit currency. Perform proration with exact rational intermediates. The stage of rounding and residual allocation is a confirmed policy, not a floating-point accident. Never aggregate currencies into a single total without an approved conversion contract.

Fixed monthly, fixed annual, and monthly active-student plans have distinct period and calculation rules. Completed, dropped, archived/deleted, and demo students are excluded. Suspended treatment, same-day activity, cancellation, mid-period price changes, annual anchors, and allocation rounding remain explicit decisions. Branch transfers change attribution, not the unique school-level subject count.

School, branch, and subject breakdowns must reconcile. Fixed-plan breakdowns are management allocations, not extra receivables or claims that the school has a per-student pricing contract. Invoice corrections need their own approved adjustment/credit/void rules. A payment reversal only corrects a receipt; it does not change the invoice's originally billed amount or refund cash.

## Atomic commands and concurrency

Financial commands require a canonical request hash and idempotency key scoped by actor and operation. Reauthorize every attempt. Commit business records, command receipt, audit, and local outbox in one transaction. Same key/body replays the committed result; changed body conflicts. Also enforce business uniqueness, especially one original invoice per stable obligation and period.

Serialize ledger-changing commands by company initially, lock affected records in deterministic order, and ensure close-relevant projection updates use the same guard or a verified snapshot/version protocol. Re-read balances inside the transaction. Retry bounded serialization/deadlock failures as whole transactions. Do not send notifications or call remote services inside a retried transaction.

Enforce immutable invoice facts in the database. An application convention alone is insufficient. Lost responses recover through the original idempotency key; they must not create another invoice or receipt. A changed preview or allocation requires a new human-reviewed intent.

## Derived data and freshness

Use indexed projections and rollups for dashboard reads. Return definition versions, coverage, source/projection checkpoints, and contributing data boundaries. An overview is only as fresh as its oldest required input. Query execution time is not source freshness. Preserve distinctions between zero, unknown, stale, partial, and not-applicable.

Late-event and identity-link rebuilds must be deterministic and idempotent. Choose and document event-time windows, ingest-time limits, recomputation behavior, and treatment after raw-data expiry before enabling retention. Analytics TTL must not delete financial provenance or deduplication evidence.

## Privacy and operations

Collect allowlisted events and properties only. Strip names, phone numbers, form inputs, route identifiers, query strings, hashes, and credentials. Keep contact information in operational systems; use opaque IDs in analytics. An opaque ID may still be sensitive in context and requires protection. Honor the approved tracking/consent policy, bound offline queues, and ensure analytics failure never breaks core product navigation or sign-in.

Inventory browser storage, inboxes, identity aliases, attribution, rollups, logs, financial records, receipts, exports, and backups before retention enforcement. Set purpose, access, retention, deletion/anonymization behavior, and exception handling for every store. Confirm policy before live collection or irreversible deletion.

Operational acceptance includes readiness during database loss, durable recovery after worker interruption, source gap diagnostics, migrations, compatibility-aware rollback, backup restore, and resource-measured load tests. Deployment order and financial cutover are review gates, not assumptions.

## Public framework references

- [NestJS modules](https://docs.nestjs.com/modules) and [custom providers](https://docs.nestjs.com/fundamentals/custom-providers)
- [Drizzle transactions](https://orm.drizzle.team/docs/transactions)
- [PostgreSQL transaction isolation](https://www.postgresql.org/docs/current/transaction-iso.html)

Verify documentation against the exact resolved package versions during the compatibility milestone. These frameworks do not automatically supply the project's billing, completeness, or idempotency guarantees.
