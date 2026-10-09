# Automaktab Analytics Setup and Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Repository role isolation overrides any single-reviewer or author-verification shortcut in a skill. Commit-sized does not authorize Git staging or commits.

**Goal:** Establish a reproducible Docker-only pnpm foundation, then deliver the full approved internal analytics and manual school platform-billing roadmap through independently verified vertical slices.

**Architecture:** React/Vite consumes runtime-validated transport contracts from a modular NestJS API. A separate worker consumes durable inboxes through application ports; Drizzle/PostgreSQL adapters own persistence under supplied transactions, while domain calculations stay framework-independent. Synthetic adapters precede separately authorized source integrations.

**Tech Stack:** React, Vite, NestJS, Drizzle, PostgreSQL, pnpm, latest stable compatible TypeScript; Docker-only local application/test runtime; Cloudflare Workers hosted runtime target, with deployment separately gated.

**Spec:** [approved architecture/product specification](specs/2026-10-05-analytics-design.md), [DS00–DS05](design/DS00-overview.md), [reference study](reference.md), existing [M0–M8 plan](implementation-plan.md), [contracts](api-contracts.md), [G01–G14](review-gates.md), [UI criteria](ui-ux-requirements.md) and [mandatory roles](agent-skill-map.md#mandatory-role-isolation-and-execution-boundaries).

Status: **execution-plan draft, approval and execution-method selection pending**. Written spec and DS approved by the user on 5 October 2026 (public-safe approval record: this document’s stage statement; approved artifacts are the linked spec and DS00–05, not a code revision); that approval permits this planning stage, not product setup. No runtime or verification commands below exist yet. All nonexistent file paths and commands are **proposed**, subject to the owning task's inspected script/configuration gate. This is a separate execution document, preserving the original milestone plan.

## Global constraints

- Allowed repository is this analytics directory only. Reinspect branch, tree and local instructions before any execution; preserve unrelated edits. No sibling source work, root/shared-machine config, host app runtime or global package install.
- Latest direction is dark deep-gray/slate + tech-blue, DM Sans; one DS token/asset manifest. Approved design version is `automaktab-dark-1.0-draft`; implementation/versioning and licensed assets still need evidence.
- Internal founder/team audience; synthetic founder fixture is never a production identity grant. No live auth, tracking, billing, external reminders, credentials or cloud resources without separate applicable authorization.
- Browser events never establish school ownership, official results, verified links, billable lifecycle or payment. School identity is Company.id; aliases are school-scoped and phones never identity evidence.
- Money is integer minor-unit decimal strings with explicit currency/server-confirmed scale. Tuition is not platform revenue. Immutable invoice facts, append-only corrections, atomic idempotency/business uniqueness/company concurrency guard and audit are mandatory.
- UNKNOWN financial intent blocks replacement submission, including edited values/new keys, until authoritative resolution. No optimistic close/receipt, financial offline queue or auto-submit after login.
- Source-issued barriers and every relevant dependency establish close readiness; local inbox continuity is insufficient. Partial/missing/stale values never become reliable zero.
- Every implementation task and combined candidate requires two fresh independent inspection-only reviewers, separate non-author allowlisted QA, and applicable exact-candidate black-box Tester PASS. Participant evidence and mandatory browser/AT checks block corresponding delivery.
- Commit, publication, PR, merge, migration on live data and deployment are separate permissions. Documentation approval does not authorize them. No destructive financial down-migration.

## Review focus

1. Process crash after durable admission or financial commit but before response must preserve accepted events/original command results: T04, T05, T13–15 fault tests.
2. Cross-school branch/subject IDs, forged public identity and expired sessions must fail without existence leakage: T03, T06–08, T14 tests.
3. Date/alias corrections crossing cutover or a closed period must expose incomplete coverage and preserve immutable history: T06, T07, T12–13 tests.
4. Rapid filters and navigation/session interruption must not relabel old data or create replacement financial intents: T08, T11, T15 browser tests.
5. Clean install in a different container architecture and partially upgraded worker/schema must reproduce builds or fail closed: T01–02, T17 operational proofs.

---

## Current evidence, approvals and blockers

Baseline `main` commit `0a5077d2c78c633e23a1c430987d9b6cd2e73cc6`; documentation-only application. Current working tree contains authorized spec/design/reference and targeted existing-doc reconciliation. No package manifests/lockfile, app code/tests, CI, Docker config or migrations exist. No earlier runtime/test/deploy result exists. The seven historical `.plan-inputs-20261003` files are absent in the selected executor; saved historical hashes cannot prove current preservation. Restore through authorized transfer and compare hashes if their cards are needed. This plan is self-contained against accessible repository contracts; do not require missing package recovery merely to start independent foundation work.

Available skills read: Superpowers brainstorming and writing-plans, Impeccable specification guidance; engineering-team local role map is available. Current Context7 callable access is unavailable; official registry/docs fallback was used. No installed agent or enforcement claim follows from role cards. No live DataFast demo interaction was verified; original composition and source-labeled feature study govern design.

| Decision | Owner / recommended choice | Stops |
| --- | --- | --- |
| Plan and execution method | User: bounded T00–T02 first, subagent-driven with repository-mandated reviews | All product code/install |
| TS7 versus Nest CLI TS6 | Integrator: try stable TS7 in approved container compatibility task; no silent downgrade; return precise failing evidence for a decision | T01 integration and dependent implementation if incompatible |
| Worker path | Architect/Integrator: approve thin `apps/worker` entry exporting reviewed API application ports, one registry | T02 worker skeleton; no duplicate worker path |
| Auth prefixes | Contracts Writer: proposed protected `/api/v1/auth/session`; document compatibility mapping from existing `/auth/session` | T03 consumers |
| Initial UI locale and browser/AT matrix | Product/UX: recommend Uzbek Latin externalized strings; supported-device matrix confirmed from actual users | First product-facing delivery (including T02 if its shell is proposed for delivery), otherwise T08/T11; not backend component readiness |
| Financial G05–07/G13, scale/timezone/rates/eligibility | Product owner signs exact synthetic examples; no inferred active-student rule | T12–16 relevant policy/command paths |
| Tracking/retention G10/G12 | Product/privacy decision owner approves definitions/purpose and store inventory | T09 live collection/expiry; synthetic explicit alternatives can proceed |
| Cloudflare account/Worker/Hyperdrive/Queue and PostgreSQL hosting topology, CI provider, regions/budget/RPO/RTO | Operations/user decision before infrastructure | T18 deployment configuration/activation |

The only present approval needed is this plan plus a selected bounded execution batch. Business finance questions do not block T00–T08 synthetic read foundations. Metadata versions are candidate observations, not compatible installed pins:

| Component | Reported candidate / official evidence | Pin acceptance |
| --- | --- | --- |
| Node | [24.21.0 LTS](https://nodejs.org/en/download); 26.10 Current excluded | Official image tag + architecture-specific digest, signed release identity |
| pnpm | [12.9.1](https://registry.npmjs.org/pnpm/latest) | Exact packageManager/integrity and lockfile format, reviewed lifecycle scripts |
| TypeScript | [7.0.2](https://registry.npmjs.org/typescript/latest) | DI/decorator metadata, Drizzle/tool API and all workspace compile proofs |
| React / DOM | [19.3.0](https://registry.npmjs.org/react/latest) / [matching DOM metadata](https://raw.githubusercontent.com/facebook/react/v19.3.0/packages/react-dom/package.json) | Exact types/plugin peers; production build and browser mount |
| Nest | Registry core [12.1.2](https://www.npmjs.com/package/%40nestjs/core?activeTab=versions) versus [release-page 12.1.1](https://github.com/nestjs/nest/releases); [CLI12.0.8](https://raw.githubusercontent.com/nestjs/nest-cli/12.0.8/package.json) uses TS~6.0.2 | Re-resolve all tags before pinning aligned core/common/platform; Node24 satisfies guide generator >=24.15; TS6.0.3 only an unapproved fallback |
| Vite | [8.3.2 release metadata](https://raw.githubusercontent.com/vitejs/vite/v8.3.2/packages/vite/package.json), plugin unresolved | Confirm latest stable tags and exact plugin Node/React peer intersection |
| Drizzle | [ORM0.45.3](https://raw.githubusercontent.com/drizzle-team/drizzle-orm/0.45.3/drizzle-orm/package.json), [Kit0.31.11](https://raw.githubusercontent.com/drizzle-team/drizzle-orm/0.45.3/drizzle-kit/package.json), driver unresolved | Exclude 1.0 prerelease; resolve pg/types; generate and apply fresh/upgrade synthetic migrations |
| PostgreSQL | [18.6](https://www.postgresql.org/support/versioning/), proposed `postgres:18.6-bookworm` | Official image tag/digest and supported host architectures; DO managed minor provider-selected |

T01 re-resolves moving latest tags once, records timestamp/provenance/engines/peers and freezes exact versions. Lockfiles, not floating `latest`, govern later execution. Metadata fetch DNS failed from shell during planning; remote official evidence does not imply container network access. If Docker/socket/network is unavailable, mark compatibility BLOCKED, preserve files and complete only independent documentation. No alternate host install or external blocked-work relocation. Coordination reports concurrent changes to parent/sibling dependencies; this task has not inspected or repaired them. Parent `node_modules` and sibling TypeScript links are not prerequisites and must not be mounted/imported/resolved into this analytics workspace. T00 freshly verifies analytics-local ownership and container dependency isolation; unresolved shared-runtime coupling blocks setup, while documentation can continue.

## Shared contracts and file responsibilities

All paths below nonexistent unless named as current documents. T00 path decisions freeze before parallel writers. Root workspace ownership remains Integrator; no feature author edits manifests/lockfile.

| File set | Single owner / responsibility |
| --- | --- |
| `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `.npmrc`, `tsconfig.base.json`, `eslint.config.mjs`, `Dockerfile`, `compose.yaml`, `.dockerignore`, `.env.example` | Integrator: exact dependencies/scripts, isolated containers, public-safe config placeholders |
| `packages/contracts/src/{index,common,events,auth,schools,analytics,billing,command-intents}.ts` | Contracts Writer: runtime schemas plus inferred transport types; a validator choice requires T01 peer/license proof |
| `apps/api/src/platform/{config,transactions,errors,authorization}.ts` | Backend owner: validated config, transaction and authorization ports, safe failures |
| `apps/api/src/modules/<module>/{domain,application,infrastructure,http}/` | Named module writer: pure domain/use cases/supplied-transaction adapters/controller guards; no global DB fallback |
| `apps/api/src/db/{schema,index}.ts`, `apps/api/drizzle/`, `apps/api/drizzle.config.ts` | Migration Writer: ordered schema ownership; feature writer requests schema updates |
| `apps/worker/src/{main,dispatch,registry}.ts` | Worker owner after Integrator transfer: durable acquisition/dispatch and one projector registry; module projectors remain API-owned |
| `apps/web/src/design/{manifest.json,tokens.css}`, `apps/web/src/components/` | FE primitives owner: DS00–05 semantic tokens and licensed asset register |
| `apps/web/src/{app/routes,auth/session,filters/url-state,data/client}.ts*` | FE shell owner: one route registry, auth/query/cache/filter boundaries |
| `apps/web/src/features/<feature>/`, `apps/web/e2e/` | Feature writer: own screens/scenarios, shared changes requested through owner |
| `packages/tracker/src/{index,queue,privacy}.ts` | Tracker owner: untrusted bounded browser telemetry |
| `docs/decisions/`, `docs/evidence/`, README additions | Lead/evidence writer after explicit handoff: public-safe approvals, hashes, NOT RUN states; no private account details |

### Task path abbreviation legend

All paths are repository-relative. In task blocks, `modules/` and `platform/` mean `apps/api/src/modules/` and `apps/api/src/platform/`; `adapters/` means `apps/api/src/adapters/`; backend `test/` means `apps/api/test/`; `contracts/src/` means `packages/contracts/src/`; frontend `components/`, `features/`, `app/`, `auth/`, `filters/`, `data/`, `design/` mean the corresponding directory under `apps/web/src/`; `e2e/` means `apps/web/e2e/`. Tracker paths explicitly belong to `packages/tracker/`; its test is `packages/tracker/test/tracker.test.ts`. Contract tests are `packages/contracts/test/`. Braces expand each listed filename; `.ts*` in T08/T11 is a proposed family, not final ownership: T00/handoff must choose `.ts` for non-UI logic and `.tsx` for React components. `features/live/stream.ts` is logic, `LiveActivity.tsx` UI. Focused allowlists always use fully expanded exact paths, never these abbreviations or globs. No root-level `contracts`, `modules`, `test` or `features` directory is intended.

Proposed contracts frozen by T03 (names are plan decisions, not existing exports):

```ts
// Shared transport: decimal strings are runtime validated.
type Money = { currency: string; minor: string };
type Metric = { value: string | null; unit: string; definitionVersion: string;
  availability: 'known' | 'unknown' | 'notApplicable' };
type QueryScope = { from: string; to: string; timezone: string;
  companyId?: string; branchId?: string; surface?: string; environment: string };
type Quality = { generatedAt: string; dataThrough: string | null;
  projectionCheckpoint: string | null; coverageFrom: string | null;
  status: 'fresh' | 'stale' | 'partial'; warnings: string[] };
// API application ports; Tx is an opaque adapter-owned handle, never frontend transport.
interface UnitOfWork { run<T>(work: (tx: Tx) => Promise<T>): Promise<T> }
interface CommandIntentStatus { state: 'inProgress' | 'committed' | 'definitelyNotCommitted' | 'unknown' }
```

`Tx` is defined in `apps/api/src/platform/transactions.ts`; no ORM type in contracts/domain. C01 freezes safe session metadata, envelope schemas, canonical hashes, cursor tie-breakers, error DTOs and revision rules before consumers. Native bigint never reaches JSON. Existing API route families remain proposed; prefix discrepancy and unresolved activation/correction/status routes are decisions before consumers, not guessed implementation APIs.

## Dependency order and execution boundaries

T00 → T01 → T02 → T03. T04 admission, T06 independent domain/link preparation and T08 primitive/shell preparation can proceed on disjoint owned files only after contract freeze and migration/startup transfers. T06 source-projector implementation waits for T05 infrastructure; T08 paired acceptance waits for its real source pipeline. T04 → T05 infrastructure readiness → T06 source projector → T05 registry/integrated-source reassessment → T07; T06 verified links precede T09 identity consumers and T10 acquisition/funnels. T05/T06/T07/T08 combine in T08 school-source delivery. T09/T10 → T11 analytics delivery. T07 plus approved policies → T12 → T13 → T14 → T15/T16. T17 operational checks apply to each relevant release; T18 is separately authorized source/deployment work.

Each task is a reviewable commit-sized deliverable; when a task spans modules, execute its named substeps as sequential candidates rather than parallel shared-file writes. No automatic Git commit step is included because current authorization is planning only. During later execution, request any required commit permission only after concrete reviewed changes exist.

## Planned command register (NOT RUN; not currently available)

Integrator creates root scripts only once their bodies/configs are reviewable. QA receives approved exact commands with permitted effects. `checks` container has workspace dependencies and ephemeral synthetic DB; no live credentials, external sinks or privileged socket mount. Published web/API bind localhost only; database not publicly exposed. Proposed Compose project `automaktab-analytics-synthetic` isolates volumes from sibling work.

```sh
# Host orchestration after configuration review and execution approval only:
docker compose -p automaktab-analytics-synthetic config --quiet
docker compose -p automaktab-analytics-synthetic build checks api worker web
docker compose -p automaktab-analytics-synthetic run --rm checks pnpm install --frozen-lockfile
docker compose -p automaktab-analytics-synthetic run --rm checks pnpm check:boundaries
docker compose -p automaktab-analytics-synthetic run --rm checks pnpm lint
docker compose -p automaktab-analytics-synthetic run --rm checks pnpm typecheck
docker compose -p automaktab-analytics-synthetic run --rm checks pnpm test:unit
docker compose -p automaktab-analytics-synthetic run --rm checks pnpm test:integration
docker compose -p automaktab-analytics-synthetic run --rm checks pnpm test:e2e
docker compose -p automaktab-analytics-synthetic run --rm checks pnpm build
docker compose -p automaktab-analytics-synthetic run --rm checks pnpm db:verify
docker compose -p automaktab-analytics-synthetic run --rm checks pnpm test:operations
```

Proposed scripts run workspace ESLint, tsc, chosen unit runner, PostgreSQL integrations, browser E2E, builds, fresh/upgrade migration fixtures and controlled operational faults respectively. Exact runner/test versions, package filters and synthetic DB configuration are resolved in T01–02. Before lockfile exists, its designated writer generates it inside `checks`; QA never resolves dependencies or modifies locks. Installation lifecycle policies are explicitly reviewed and allowlisted, not blindly ignored or enabled. QA failures return to writer; failed output is evidence, never repaired by QA.

For each task's named test file, proposed focused invocation is `docker compose -p automaktab-analytics-synthetic run --rm checks pnpm test:focused -- <exact-test-path>`. T02 must create `test:focused` mapping exact unit/integration/browser paths to their reviewed runner and reject unknown paths. Before T02 exists, T01 runs reviewed minimal container fixtures through task-specific commands recorded by Integrator; do not invent a failing executable command or equate missing tooling with a behavior failure.

## Tasks

### T00 — Freeze bounded execution contract (M0)

**Writer:** Lead Integrator; adviser Architect. **Existing files:** inspect AGENTS/README/all linked contracts/gates/design. **Proposed creates:** `docs/decisions/execution-scope.md`, `docs/decisions/toolchain.md`, `docs/evidence/task-register.md`. **Produces:** approved T00–T02 boundary, owned paths, synthetic container effects and review/evidence key format. No application execution.

- [ ] Reinspect `git status --short`, `git branch --show-current`, `git rev-parse HEAD`, `git diff --check`, `rg --files -g AGENTS.md -g SKILL.md -g package.json -g pnpm-lock.yaml -g compose.yaml` within analytics; report missing tools without installing.
- [ ] Record written-spec approval evidence, plan approval/execution method, current changes, file owners and explicit no-publication scope. Resolve thin worker path and availability of Docker/build/network and actual browser/AT access.
- [ ] Freeze G01/G02 and current open gate list; record input-package absence and any authorized recovery separately. Confirm no cloud/live credentials are loaded.
- [ ] R1/R2 inspect scope independently; Adviser challenges dependency and permission assumptions. Exit only with reviewable concrete T01 contract. Documentation validation is not an app test.

### T01 — Prove exact latest-stable compatibility in Docker (M1/G03)

**Writer:** Integrator only. **Proposed files:** root manifest/workspace/lock/npmrc/TS base/Dockerfile/Compose/.dockerignore/.env.example; `tools/compatibility/{nest-di,web-build,drizzle-roundtrip}.ts`, `tools/compatibility/metadata.json`, `docs/decisions/toolchain.md`. Temporary fixtures stay in assigned analytics paths, no external bypass. **Produces:** exact frozen package/image matrix and successful minimal compiler/runtime proofs; fixture removal only after equivalent T02 tests exist.

- [ ] Read current official tags/engines/peers/licenses, exclude prereleases, choose exact runtime-validator/test/lint/browser versions, compare all Nest packages and capture artifacts. Do not pin the mismatched Nest observations unexamined.
- [ ] Author minimal failing DI fixture: resolve a service with injected repository, assert its method returns `synthetic-ok`; an intentionally omitted provider must fail with DI error. Add compiler metadata assertion and import-format build. Prove web mount, one Drizzle schema generate/apply/query/rollback, unit runner and lint/types with TS7; body/path commands approved after reviewable fixture scripts exist.
- [ ] Run RED for intended missing behavior/configuration, recording exact commands/output. Wrong Node, unresolved DNS or runner absence is infrastructure BLOCKED, not intended RED. Implement only missing foundation configuration.
- [ ] Run clean second-container install from frozen lock, DI runtime assertions, React/Vite production build and Drizzle generation/roundtrip. TypeScript compile success alone is insufficient; ESM/NodeNext/decorator metadata emitted behavior is exercised.
- [ ] On incompatibility preserve failing evidence, stop integration and propose exact options. TS6 fallback, another framework or prerelease ORM needs a documented user decision; no force/legacy-peer-deps shortcut.
- [ ] Separate QA repeats allowlisted proofs, R1/R2 independently inspect exact dependency/configuration/evidence, Adviser assesses complexity. Exit G03 only with reproducibility; no product UI delivery claim.

### T02 — Bootable API, worker, web and synthetic database foundation (M1)

**Writer:** Integrator is sole first-batch implementer. **Proposed creates:** `apps/api/{package.json,tsconfig.json,nest-cli.json,src/main.ts,src/app.module.ts,src/platform/config.ts,src/platform/transactions.ts,src/platform/errors.ts,src/health/health.controller.ts}`, `apps/worker/{package.json,tsconfig.json,src/main.ts}`, `apps/web/{package.json,index.html,vite.config.ts,src/main.tsx,src/app/App.tsx}`, `packages/contracts/{package.json,tsconfig.json,src/index.ts}`, `packages/tracker/package.json`; `apps/api/src/db/{index,schema}.ts`, `apps/api/drizzle.config.ts`, `apps/api/drizzle/0000-foundation.sql`; `tools/check-boundaries.ts`, `tools/test-focused.ts`, `apps/api/test/foundation.integration.test.ts`, `apps/web/e2e/foundation.spec.ts`, README tested-command section. Shared manifests stay Integrator-owned. In this first-batch single-writer task, Integrator also holds the migration/startup writer role; T03 handoff assigns the separate Migration Writer before later schema edits.

**Interfaces:** `loadConfig(env): RuntimeConfig`, `UnitOfWork.run<T>`, `GET /health/live` (process only), `GET /health/ready` (DB/schema readiness); worker exits safely on invalid config; internal smoke shell visibly `Synthetic environment` with no fake live metrics. Proposed operational limits for synthetic proof: 1 MiB admission body, 100 events/batch, queue 1,000 events, up to 3 transaction retries, max list page 100. Architect must review and freeze these technical limits before consumer use; they are not financial policy or capacity claims.

- [ ] Write RED `foundation.integration`: missing DB/config produces not-ready without secret disclosure; rolled-back transaction persists no probe; API/worker invalid config fail closed. `foundation.spec`: synthetic label and keyboard page title appear; forbidden server/ORM frontend imports fail boundary check.
- [ ] Run focused tests after T01 runner exists; confirm behavior-level failures. Implement container health/dependency sequencing, real transaction handle with no global fallback, safe redacted errors, boundary script and initially nonfunctional tracker package placeholder.
- [ ] Implement root planned script register and strict `test:focused` path dispatcher. Capture exact executed scripts and allowed effects; no script name is a claim until inspected and executed.
- [ ] QA runs all applicable registered checks, fresh/upgrade synthetic DB exercise and container boot with worker restart/DB-loss readiness. The internal web smoke fixture establishes browser mount only and is not delivered as product UI. If shell delivery is requested in this batch, first transfer/assign `apps/web/src/design/manifest.json` and `tokens.css` to the Integrator as temporary sole writer (explicit transfer to FE owner at T08), implement DS mappings, confirm browser/AT matrix and obtain Tester evidence for UX-B03/B08, A11Y-01–10 and UX-R01 with applicable N/A reasons. Tester verifies synthetic sink/config evidence without diagnostic scripts.
- [ ] R1/R2 + Adviser assess combined foundation; if mandatory UI/browser/AT access unavailable, component readiness may be reported but product delivery remains BLOCKED. Without that UI evidence report FOUNDATION_COMPONENT_READY only, web fixture not delivered and Tester product verdict NOT RUN/BLOCKED. First-batch stop: no auth/tracker/finance implementation until next bounded approval.

### T03 — Freeze read/event/session contracts and synthetic authorization (M2)

**Writer:** Contracts Writer for schemas; Backend writer for auth after schema handoff. **Proposed creates:** contracts `common.ts`, `events.ts`, `auth.ts`, `schools.ts`; API `platform/authorization.ts`, `modules/auth/{application/session.ts,http/session.controller.ts,infrastructure/synthetic-provider.ts}`, `test/auth.integration.test.ts`; contracts `test/read-contracts.test.ts`. **Consumes:** T02 transaction/config. **Produces:** schema V1 envelope/error/query metadata, `authorize(actor, companyId?, operation): Promise<void>`, `createSession(exchange): Promise<SessionMetadata>`, `revokeSession(id): Promise<void>`. Prefix choice recorded before routes implemented.

- [ ] RED contract tests reject extra fields, unsafe sequence numbers, malformed money/offset/timezone, wrong branch-school pairing. Auth RED rejects wrong state/audience, replay/expiry/non-granted/impersonation and missing provider; dedicated synthetic grant is environment-bound.
- [ ] Freeze `/api/v1/auth/session` proposal or documented alternative, OpenAPI/schema generation, safe error envelope, CSRF/origin and cookie settings; implement guard/use cases with revocation and synthetic-only provider.
- [ ] Run focused contracts/auth tests; PostgreSQL test one-time exchange response loss requires fresh handoff, not reusable code. QA repeats guarded route tests. Security reviewer checks no production synthetic fallback, no source secret reuse and no cross-school leak.
- [ ] R1/R2 approve frozen contract revision before parallel consumers. G09 production principal/team grants remain open.

### T04 — Durable admission and privacy boundaries (M2)

**Writer:** Collection Backend; Migration Writer exclusively writes requested schema/migration changes. **Proposed paths:** `modules/collection/{application/admit.ts,domain/event-identity.ts,infrastructure/inbox.repository.ts,http/collector.controller.ts}`, `test/admission.integration.test.ts`. **Interface:** `admitEvents(input: PublicBatch | TrustedBatch, producer: ProducerContext): Promise<AdmissionReceipt>`; schema-defined accepted/duplicate/rejected per item, no success before durability.

- [ ] RED: forged public payment/lifecycle/official-result and private contact/form/query/route-ID payloads rejected; unknown trusted schema quarantined; source/environment credential mismatch fails. Identical event-ID retry returns duplicate, changed content conflicts.
- [ ] RED DB outage/crash-before-commit emits no202; crash-after-commit-before-response identical retry retrieves original durable receipt. Framing rejects whole batch; item failures explicit; overlimit returns safe bounded error/Retry-After.
- [ ] Implement separate guards/allowlists, canonical request identity and atomic receipt/inbox/quarantine transaction. Raw failed private payloads are not logged/quarantined verbatim.
- [ ] Focused PostgreSQL checks then QA allowlist; R1/R2 approve with privacy inventory slice. G12 live consent/retention remains open; no source credentials.

### T05 — Real worker acquisition, dispatch and atomic projection (M3)

**Writer:** Worker owner; Integrator explicitly transfers `apps/worker/src` ownership; API projectors remain module-owned. **Proposed paths:** worker `dispatch.ts`, `registry.ts`; API `modules/collection/infrastructure/dispatch.repository.ts`, `test/worker.integration.test.ts`. **Interface:** `dispatchBatch(limit: number): Promise<DispatchResult>`, `Projector.apply(tx: Tx, envelope: TrustedEnvelope): Promise<ApplyResult>`; one registry declares schema/aggregate dependency handlers.

- [ ] RED worker acquires persisted inbox without manual direct-call test shortcut; competing workers do not lose acknowledged events; n+1 waits for n and parent, conflict quarantines, unsupported version blocks relevant completeness.
- [ ] RED kill between projection and checkpoint rolls back both; kill after commit resumes without duplicate counts; bounded retry exhaustion visible in source status. T05 first exits infrastructure COMPONENT_INTEGRATION_READY using an explicitly labeled fixture handler; it cannot claim source pipeline acceptance. T06 then authors source projector against this dispatch port. Worker owner registers it, freezes a new combined candidate and obtains renewed QA/R1/R2 integration evidence before T07 or school-slice acceptance.
- [ ] Implement lease/recovery/ordered claim protocol with Postgres locking, atomic apply/checkpoint and bounded dispatch/backoff. Remote effects never occur inside retried DB transactions.
- [ ] QA runs restart/concurrent-worker scenarios; R1/R2 inspect registry and transaction-handle flow. Leaf projector tests alone cannot close W01/W02 source wiring acceptance.

### T06 — School structure, verified links and canonical aliases (M3/G08)

**Writer:** Schools/Identity Backend; Migration Writer schemas. **Proposed paths:** `modules/schools/{domain/subjects.ts,application/project-school.ts,application/query-schools.ts,http/schools.controller.ts}`, `modules/identity/{application/verified-link.ts,domain/link-proof.ts}`, `test/schools-identity.integration.test.ts`. **Interfaces:** `applySchool(tx, event): Promise<void>`, `verifyLearnerLink(proof): Promise<LinkRevision>`, `querySchools(actor, page): Promise<SchoolPage>`; GET school/list/subjects routes under agreed protected prefix.

- [ ] RED same phone remains different subjects; authoritative recreate alias bills one subject; multi-school learner keeps separate obligations; branch transfer changes attribution without duplicate subject. Invalid proof, cross-school branch, demo/cascade/archive/restore/import and late corrections retain effective history.
- [ ] Implement Company.id read model, effective-dated school-scoped aliases and independently verified analytics link proof/revoke; do not conflate alias with anonymous-browser link.
- [ ] Run focused DB tests with owned registered projector and source-scope authorization. QA repeats, R1/R2 approve link foundation before downstream acquisition/identity consumers. No operational source mutation.

### T07 — Authoritative barrier and source-status read slice (M3/G04)

**Writer:** Source-completeness Backend; contracts fields via Contracts Writer. **Proposed paths:** `modules/schools/{domain/completeness.ts,application/source-status.ts,http/source-status.controller.ts}`, `adapters/synthetic/source-manifest.ts`, `test/completeness.integration.test.ts`. **Interface:** `verifyCompleteness(manifest: SourceManifest, applied: AppliedHeads): CompletenessResult`, `getSourceStatus(actor): Promise<SourceStatus>`.

- [ ] RED locally contiguous inbox without source-issued manifest is unknown; missing tombstone/head/parent/alias, hash mismatch, source environment mismatch and unknown cutover block readiness. Declared coverage cannot imply prior active days.
- [ ] Implement source-consistent manifest hash/as-of/cutover/heads and compare all relevant dependencies, oldest boundary and quarantine status. Source-issued proof is distinct from consumer checkpoint.
- [ ] Run full admitted-source→worker→projection→query test and deterministic rebuild; QA verifies actual registered pipeline, R1/R2 inspect barrier completeness. Status read remains useful with blockers; finance close cannot proceed.

### T08 — DS primitives, protected shell and school/source UI (M4 initial read slice)

**Writer:** FE owner; UX specifies, no second token writer. **Proposed paths:** design manifest/tokens; `components/{Button,TextField,Badge,Navigation,DataState,Table,Dialog}.tsx`, `app/routes.tsx`, `auth/session.ts`, `filters/url-state.ts`, `data/client.ts`, `features/schools/{SchoolList,SchoolDetail,SourceStatus}.tsx`, `e2e/school-source.spec.ts`, `components/controls.test.tsx`. **Consumes:** T03 session/read schemas; T05–07 real API/worker for integrated acceptance. **Interface:** `normalizeScope(url): QueryScope`, `useSchoolQuery(scope): DataViewState<SchoolView>` following DS04 state model.

- [ ] RED primitive tests enforce native keyboard semantics, labels/error associations/focus restoration and disabled/pending duplicate suppression. Manifest ties token/asset license/hash to approved DS source hashes; no arbitrary feature hex.
- [ ] RED UI scenarios stale-old request finishes after new school filter: result stays with original query key and incompatible branch clears. Expiry/logout removes protected data/streams; Back/Forward/refresh restore permitted normalized filters without commands.
- [ ] Implement DS00–05 and route/session/read wiring, sample label, school detail→source-status path. Cover loading, no records/no matches, known zero, unknown/unavailable, stale/partial, rate limit/offline/error, permission denied and interrupted sessions; no invented money.
- [ ] QA executes registered E2E/API suite; Tester black-box runs UX-B01/02/03/08 + A11Y-01–10 + UX-R01 across agreed matrix and screenshots of each state. 320 reflow/200% text; 360/768/1280/1440, long labels/values, reduced motion/forced colors and actual computed contrast.
- [ ] R1/R2 review exact combined pipeline + UI candidate/evidence, Adviser checks comprehension. Component readiness is not paired acceptance; integrated Tester PASS required. UX-U01 actual founder/team comprehension before relevant launch; unavailable participant/matrix row remains BLOCKED, not replaced by an agent.

### T09 — Bounded tracker, traffic/usage and privacy-aware identity consumers (M2/M4)

**Writer:** Tracker Backend writer then traffic writer through explicit handoff; frontend feature independent after schemas freeze. **Proposed paths:** tracker `src/{index,queue,privacy}.ts`, `test/tracker.test.ts`; API `modules/{traffic,usage}/application/project-events.ts`, `domain/metric-definitions.ts`, `application/query.ts`; contracts `analytics.ts`; `test/traffic-usage.integration.test.ts`. **Interfaces:** `track(event: PublicEvent): void` never throws into host workflow; `queryTraffic(actor, scope): Promise<TrafficResult>`; versioned metric units/nullability/quality from T03.

- [ ] RED navigation/remount retries stable event IDs, bounded queue overflow policy explicit, permanently invalid payload no infinite retry, Retry-After honored; denied consent/storage failure does not break sign-in/navigation. Strip query/hash/route identifiers/contact properties before persistence.
- [ ] RED known zero != absent coverage; anonymous/session/actor/school IDs distinct; daily rotation/shared-device/logout cannot prove cross-domain identity. T06 verified links precede trusted linkage consumer; marketing school may be null.
- [ ] Freeze explicit synthetic metric/attribution definitions, late-event/rebuild window and privacy inventory before projectors. Implement bounded traffic/pages/sources/usage read models and replay-safe rollups; no live tracker installation in operational surfaces.
- [ ] QA tests deterministic rebuild/late linking without duplicate counts and SQL-bound queries; R1/R2 inspect trust/retention. Any live consent/expiry decision missing blocks activation, not labeled synthetic definition experiments.

### T10 — Acquisition, goals/funnels/journeys and official learning (M4)

**Writer:** Analytics Backend in disjoint modules after contracts/link foundation; Contracts Writer publishes schemas. **Proposed paths:** `modules/acquisition/{domain/attribution.ts,application/project-conversion.ts,application/query.ts}`, `modules/funnels/{domain/ordered-funnel.ts,application/revise-definition.ts,application/query.ts}`, `modules/learning/{application/project-result.ts,application/query.ts}`, `test/analytics-definitions.integration.test.ts`. **Interfaces:** `evaluateFunnel(events, definitionRevision): FunnelResult`; `queryLearning(actor, scope): Promise<LearningResult>`; named goal/funnel revision commands from existing contracts.

- [ ] RED browser completion does not enter official learning; trusted practice separate; anonymous identify not Company conversion; verified lead link and Company creation separate from school's student leads.
- [ ] Freeze own first/last-touch window/exclusions/timezone/definition fixtures before calculations: out-of-order step, repeated goal, conversion boundary, absent link and late correction have explicit expected results. Do not infer DataFast algorithms or cohort retention from new/returning labels.
- [ ] Implement immutable definition revisions, ordered window evaluation and deterministic recompute. Domain imports no HTTP/Nest/Drizzle; closed finance never rewritten by analytics rebuild.
- [ ] QA verifies definition version/filter/coverage including mixed-currency grouped totals and oldest contributor freshness; R1/R2 inspect no unsupported causal/retention/revenue claims. Goal configuration changes use guard/audit; unresolved goal policy blocks that variant only.

### T11 — Analytics views and bounded live activity (M4)

**Writer:** FE analytics owner and API live owner in disjoint paths after contract freeze. **Proposed paths:** `features/analytics/{Overview,Traffic,Acquisition,Usage,Learning,FunnelEditor,Journey}.tsx`, `features/live/{LiveActivity,stream}.ts*`, `modules/live/{application/snapshot.ts,http/stream.controller.ts}`, `e2e/analytics-live.spec.ts`, `test/live.integration.test.ts`. **Interfaces:** `GET /live/snapshot` then `/live/stream` with bounded cursor/replay/reset; normalized query scope and quality retained.

- [ ] RED timezone/DST/period comparisons do not mislabel values; rapid source/school/date change cannot show old-filter data; all metric/chart legends include units/definition/coverage and text/table alternative.
- [ ] RED live replay dedup, disconnect backoff, expired cursor reset and expired session closes stream; bounded queues/pool limits and accessible pause preserve reading/focus. Implement server limits from reviewed technical contract.
- [ ] Implement overview/traffic/pages/event trends, acquisition/funnel/journey, usage/official-learning/practice and live screens with all T08 state matrix rows, DS chart summaries and navigation.
- [ ] QA runs E2E/server live tests; Tester UX-B01–03/07/08, all applicable A11Y/UX-R and UX-U01 actual participant; two reviewers + Adviser assess full paired candidate. Numeric latency/bundle budgets first recorded with hardware/data/workload; proposed budget cannot be reported as benchmark PASS.

### T12 — Draft policy/contracts and exact school billing basis (M5/G06/G07/G13)

**Writer:** Data/Billing; Migration Writer handles schema files; Contracts Writer billing transport. **Proposed paths:** `contracts/src/billing.ts`; `modules/billing/{domain/policy.ts,domain/period.ts,domain/calculate.ts,application/revise-contract.ts,application/activate-policy.ts}`, `test/billing-calculation.test.ts`, `test/contracts.integration.test.ts`, `test/fixtures/policy-cases.json`. **Interfaces:** `calculateInvoice(input: CompleteBillingBasis, policy: ConfirmedPolicy): InvoiceDraft`; `reviseContract(actor,input): Promise<ContractRevision>`; activation route/state schema must be approved before command implementation.

- [ ] Stop dependent policy implementation until named decision owner signs exact G06/G07/G13 fixtures: currency/scale/timezone/rate/effective dates, monthly/annual anchors/same-day/suspension/proration/rounding/residual/cancellation/overlap. Synthetic alternatives remain explicitly hypothetical, never implicit live defaults.
- [ ] RED unknown policy returns blocker; completed/dropped/archived/deleted/demo excluded; canonical school subject counted once; fixed management branch allocation reconciles but creates no extra receivable.
- [ ] RED exact fixtures cover 31-day partial month, leap February, same-day changes, transfer, rate revision/cancellation and annual missing-date anchor; test rational intermediate totals/minor rounding and school=branches=subjects under chosen policy.
- [ ] Implement pure exact arithmetic, stable obligation/period identity and append-only revisions with stale/overlap guards. Authorized draft→confirmed→active command commits audit/idempotency; missing decisions fail closed.
- [ ] QA runs pure+PostgreSQL concurrent revisions/activation/replay tests; R1/R2 inspect approved fixture evidence and design purity. No real contract activation permission follows.

### T13 — Nonposting preview and immutable invoice close (M5)

**Writer:** Data/Billing; Migration Writer DB immutability constraints. **Proposed paths:** `modules/billing/{domain/preview-hash.ts,application/preview-invoice.ts,application/close-invoice.ts,infrastructure/invoice.repository.ts}`, `test/invoice-close.integration.test.ts`. **Interfaces:** existing preview/close routes; before T13 implementation, Contracts Writer approves `packages/contracts/src/command-intents.ts` actor-bound discovery/status/lifetime/logout/minimal-data contract and durable intent identifiers used by close; receipt-specific handlers remain T14. `previewInvoice(actor,input): Promise<InvoicePreview>`; `closeInvoice(actor,input,key): Promise<ClosedInvoice>`; T07 completeness + T12 approved policy.

- [ ] RED preview writes no receivable; missing source/barrier/alias/policy/coverage blocks close; hash includes every consequential input/version/line/allocation and excludes volatile display time.
- [ ] RED concurrent same-key, new-key same obligation/period, new contract revision, stale preview/source changes, deadlock retry, crash before commit and response loss after commit all yield at most one original invoice. Exact replay reauthorizes and retrieves original result.
- [ ] Implement company/obligation guard with close-relevant projector protocol, consistent snapshot recalculation, business uniqueness and DB UPDATE/DELETE protection of closed facts. Commit record/receipt/audit/outbox atomically; no external effect in retried transaction.
- [ ] QA performs real PostgreSQL concurrency/immutability tests, reviewers inspect hash/lock ordering and unsafe completeness. Return SOURCE_NOT_READY/PREVIEW_STALE without posting; current policy/live billing authorization separate.

### T14 — Manual receipts, credit, allocations and full reversal (M6)

**Writer:** Data/Billing; Contracts Writer command-intents, Migration Writer ledger. **Proposed paths:** `contracts/src/command-intents.ts`; `modules/billing/{application/record-receipt.ts,application/allocate-receipt.ts,application/reversal-preview.ts,application/reverse-receipt.ts,application/command-status.ts,infrastructure/ledger.repository.ts}`, `test/receipt-reversal.integration.test.ts`. **Interfaces:** existing receipt/allocation/reversal routes; `getCommandStatus(actor,intentId): Promise<CommandIntentStatus>` proposed actor-bound discovery/status contract approval required before consumers.

- [ ] RED positive minor money only, strict fields, currency/school match, eligible invoice and bounded reference; partial receipt leaves balance, excess explicit credit, no tuition/payment processor/card credentials.
- [ ] RED allocation/reversal race, other receipt balance change and preview expiry invalidate consequences. Server preview binds actor/company/payment/operation/reason/hash/version/ledger revision and exact allocation/credit/balances; one reversal per receipt independently of key.
- [ ] RED exact committed replay succeeds despite own advanced revision, changed body conflicts, wrong actor/company denied, unknown result discovery no existence leak. Response loss cannot authorize replacement new key; status absence is UNKNOWN unless server protocol proves definitelyNotCommitted under concurrency.
- [ ] Implement deterministic company ledger locks, original receipt and compensating append-only entries, command receipt/audit/outbox in one transaction. Freeze intent recovery lifetime/access/minimal-data/logout/cross-session rules; expired discovery cannot silently mean noncommit.
- [ ] QA PostgreSQL concurrent/rollback/fault tests, R1/R2 review recovery and balances. Partial cash reversal is excluded pending a future contract; full receipt reversal records bookkeeping, never refunds money.

### T15 — Financial review/recovery UI (M5/M6)

**Writer:** FE finance owner only; FE shell route changes through owner. **Proposed paths:** `features/billing/{Contracts,InvoicePreview,InvoiceDetail,ReceiptForm,AllocationReview,ReversalReview}.tsx`, `features/billing/command-intent.ts`, `e2e/finance-recovery.spec.ts`. **Interface:** `submitReviewedIntent(intent): Promise<CommandViewState>`; DS04/05 presentation plus T14 server discovery, not browser authority.

- [ ] RED preview→confirm revalidates source/policy; duplicate click/navigation/session expiry/lost response retain original intent. UNKNOWN blocks any replacement even amount/allocation edits; no optimistic committed receipt/close and no financial offline queue.
- [ ] RED logout clears protected data but server original intent discoverable after authorized return; safe recovery returns one committed result, exact replay labeled separately from fresh balances. Definite rejection needs deliberate new review/key; stale reversal never silently accepts changed consequences.
- [ ] Implement full manual fixed-monthly/annual/active-subject review, school/branch/subject basis, billed/collected/outstanding/credit/normalized revenue distinction, server-confirmed currency/scale and explicit review/dialog actions. Corrections are separate gated flows.
- [ ] QA browser/API interruption/concurrency suite; Tester UX-B01–05/08, A11Y/UX-R, UX-U02/03 actual participants; both reviewers inspect final combined ledger+UI exact candidate, Adviser challenges financial comprehension. Missing recovery or participant evidence blocks relevant delivery.

### T16 — Separate corrections, overdue and in-app reminders (M6)

**Writer:** Data/Billing backend + FE reminders after schema freeze; serialize shared ledger changes. **Proposed paths:** `modules/billing/{domain/correction.ts,application/correct-invoice.ts}`, `modules/reminders/{domain/overdue.ts,application/refresh.ts,application/acknowledge.ts}`, `features/{billing/CorrectionReview,reminders/Reminders}.tsx`, `test/correction-reminders.integration.test.ts`, `e2e/reminders.spec.ts`. **Interfaces:** G05 approved correction command contract; existing GET reminders/POST acknowledgment; `calculateOverdue(invoice,businessDate,confirmedConvention): OverdueState`.

- [ ] Block correction implementation until adjustment/credit/void states, paid/unpaid balances, permission/audit/review/idempotency and exact examples approved. RED original closed facts immutable; reversal never substitutes correction.
- [ ] RED positive eligible outstanding required; due-business-local date not viewer timezone; paid/corrected invoice disappears, reversal can reopen overdue; acknowledgment means seen, not paid.
- [ ] Implement append-only correction under same ledger guard, approved red/amber severity thresholds and numeric overdue days. Durable notice dedup uses invoice/type/balance-due revision/time bucket; outage recovery derives current state, not historical spam. Thresholds/cadence need explicit decision before enabling; no guessed dangerous severity.
- [ ] QA ledger+job dedup tests; Tester UX-B05/06/08 and finance A11Y cases; R1/R2 + Adviser assess combined correction/reminder candidate. No suspension/login-block path, no external sending. Outbound channels remain disabled.

### T17 — Migrations, restore, failure recovery and measured operations (M8)

**Writer:** Integrator operations; Migration Writer ordered migration changes. **Proposed paths:** `tools/operations/{verify-migrations,restore-exercise,load-synthetic}.ts`, `docs/operations/{local-recovery,rollback,capacity}.md`, `test/operations.integration.test.ts`. **Produces:** reproducible synthetic fresh/upgrade/restore evidence and measured resource/latency/lag reports; no capacity promise without approved budget.

- [ ] RED worker down/DB loss/partial schema-consumer upgrade cannot show fresh data or allow unsafe close; migrations preserve accepted events and closed financial facts. Fresh then previous-schema upgrade checksum/constraints prove same relevant schema semantics.
- [ ] Implement expand→compatible consumer→producer→frontend order and safe flags; rollback pauses closes, keeps schema compatible with previous app, replays accepted inbox without duplicates. No destructive ledger downs or broad volume deletion.
- [ ] QA alone runs reviewed allowlisted nonproduction restore/fault/load commands. Use explicit synthetic DB identifiers and disposable task volumes; forbid live endpoints, credentials, real sinks and unbounded resources. Record Docker allocations/dataset/workload and candidate.
- [ ] Approve budget before load: proposed 100 admitted unique events/sec for 30 min with worker interruption/concurrent reads; 50 schools/50k students/10M events per month are design targets, not results. Check every acknowledged event persists and replay counts remain exact; define p95/queue/storage thresholds before run, never choose them after seeing output.
- [ ] Verify privacy store retention/deletion inventory separately; expiry disabled until approved and rebuild/provenance implications proved. R1/R2 + Adviser review operations and final applicable UI evidence; no deployment claim.

### T18 — Separate live integrations and Cloudflare Workers delivery (M7/M8)

**Writer:** separately authorized integration/release owners; this plan grants no sibling edits or cloud write. **Proposed analytics-owned paths only after approval:** `adapters/source/*`, `docs/operations/cutover.md`, `.github/workflows/ci.yml` if GitHub Actions chosen, `deploy/*` if topology chosen. Operational source paths cannot be specified as owned here; new scoped task reinspects them.

- [ ] Obtain repository-specific source/auth/tracker/live-data/credential/deployment permissions and policy/cutover decisions. RED synthetic producer rollback emits no outbox event, commit does; source barrier snapshot coherent; trusted credentials scoped producer+environment. Source code and original ORM stay in separately authorized repository.
- [ ] Prove real adapter using safe synthetic records before one-surface-at-a-time tracking rollout; avoid double old/new tracking. Confirm privacy, retention, canonical identity and authoritative acquisition capture; no live school data in repository fixtures/logs.
- [ ] Select CI provider, Cloudflare account/environment, Worker deployment path, Hyperdrive/Queue topology, PostgreSQL host/region, backup RPO/RTO, and costs deliberately; define secret handling and prevent accidental push-triggered deployment. CI starts as validation only if permitted; deployment remains gated/environment-approved.
- [ ] QA replays partial rollout/source outage and nonproduction restore; R1/R2 + Tester + Adviser exact combined candidate. Before reporting published revision inspect remote SHA; before CI success inspect checks for that SHA; before running service inspect actual deployment. Merge/deploy/live migration remain distinct approval steps.

## Acceptance and review choreography

Each task handoff names a concrete accountable writer and exact owned paths, base/candidate, input contract/design/policy revisions, intended effects and stopping condition. Agent roles are assignments, not simultaneous agent counts. Recommended execution uses one writer at a time for first batch, fresh Correctness R1 and Security/Data R2, independent verification-only QA, black-box Tester, and Architect/Adviser. UX participates in product-facing tasks; FE/backend writers can later work in disjoint modules only after shared freezes.

1. Writer authors RED test, confirms intended failure, implements minimum, and supplies focused evidence; broad workspace checks required at integrated milestone. Writer tests are not independent QA certification.
2. Freeze immutable content/tree/patch digest including untracked code, lockfile/generated artifacts, config, contract/design versions and initial evidence. Non-author QA receives explicit exact allowlist; no edits/snapshot updates/lock resolutions. Its results form final evidence manifest.
3. Fresh R1/R2 independently inspect same candidate/evidence and submit initial reports before seeing each other. Neither executes project code or edits. Findings returned to writer; fixes change candidate, trigger affected QA and both re-reviews.
4. Tester verifies authorized synthetic sinks independently before consequential browser actions; no project/diagnostic scripts or editing. Evidence identifies screen/state/criterion/candidate/environment/fixture/expected-observed/capture digest. Adviser challenges remaining assumptions. Add resulting visual evidence to review key; both reviewers reassess final key if evidence changed.
5. Integrator creates combined candidate even for mechanical integration. QA broad checks, both reviews, exact-candidate Tester verdict and mandatory participant evidence are required. Any candidate/key/config/contract/design/evidence change invalidates approvals; scoped retained evidence needs explicit justification.

`COMPONENT_INTEGRATION_READY` means required API/DB/QA/review evidence passed for that component. Paired E2E/UI is NOT RUN until named combined task (T08/T11/T15/T16); it is not a circular prerequisite for backend work. `PRODUCT_SLICE_PASS` requires integrated QA/reviews/Tester and all applicable mandatory UI/AT evidence. `LIVE_ACTIVATION_READY` additionally closes privacy/source/auth/business/operations permissions; no state automatically grants the next.

## First batch approval boundary and failure handling

Recommended first execution authorization: **T00–T02 only**, analytics paths listed above, container-only network package/image fetch, synthetic local PostgreSQL/migrations/tests; no sibling, live auth/tracker/finance, credentials, cloud, Git publication or outbound effects. All exact pins unresolved are resolved through T01 evidence before further scaffolding. If latest stable TS7 is incompatible, stop with concrete failure/options rather than automatic TS6 selection.

Keep preexisting doc inputs byte-for-byte except the separately owned evidence/README changes; capture baseline and new files. On interrupted install: resume/rebuild from reviewed pin/lock inside container, never partially trust node_modules. On incomplete lock: writer fixes, reruns clean install, freezes new candidate; QA does not generate it. On failed fresh/upgrade migration: retain diagnostics and synthetic volume, reset only an explicitly designated disposable database after scope review; never run blanket `down -v`. On container DB loss: readiness fails; UI unavailable/partial; durable acknowledged items recover. On API/worker mismatch: stop unsafe consumer/close and retain durable inbox; forward-compatible schema preferred. On unavailable QA/browser/AT: deliver component status only, mandatory product acceptance remains BLOCKED.

Exit first batch only after exact versions/lock/image provenance, clean reproduction, real DB/DI/API/worker and synthetic web shell evidence, registered exact commands and both independent reviews/QA. This exit is FOUNDATION_COMPONENT_READY; product-facing shell delivery is deferred to T08 unless the explicit T02 DS/browser/AT/Tester branch is completed. A web mount smoke is never Tester PASS. Host or docs-only success cannot substitute runtime. Runtime activation and UI delivery are not claimed now.

## Decision and coverage map

| Existing milestone/gate | Implementing tasks |
| --- | --- |
| M0 / G01–02 | T00; authorization repeated T18 |
| M1 / G03 | T01–02 |
| M2 / G09/G12 | T03–04/T09; live grants/privacy T18 |
| M3 / G04/G08/G10 | T05–07; rebuild T09–10 |
| M4 / G14 | T08–11; DS and UI criteria throughout |
| M5 / G06–07/G13 | T12–13/T15 |
| M6 / G05 | T14–16 |
| M7 / G02/G09/G12 | T18 separately authorized source/privacy cutover |
| M8 / G11 | T17–18, final combined reviews each milestone |

Full roadmap retained: overview, acquisition, traffic/pages/events, goal/funnel/journey, usage, official learning/practice segmentation, live activity, school/branch/subject views, individual subscription terms, preview/immutable close, receipts/credit/reversal/correction, overdue in-app reminders and diagnostics/audit. Additional general retention/multitouch/replay/social integrations are definition/scope decisions, not hidden removals or implicit commitments.

## Evidence and stopping condition

Current plan checks: document links/content/diff only. No app lint/types/unit/integration/E2E/build/migration/load, visual/AT/participant/CI/deployment result exists. Proposed commands are NOT RUN. Record document adversarial findings and exact candidate in [plan review](implementation-execution-plan-review.md); that review is not R1/R2 implementation approval or Tester PASS.

At each delivered batch report outcome, source/target revision or immutable content digest, files/behavior, exact commands passed/failed/not run, synthetic visual criterion evidence, R1/R2/QA/Tester/Adviser findings and re-review, compatibility/contract/migration/design changes and remaining decisions. Never omit blocked mandatory checks. Stop after presenting this reviewed plan until user approves its content, selects execution method and bounded batch. Recommended **subagent-driven**, because trust/financial failure paths and shared contract handoffs require independent per-task scrutiny; repository-required two-reviewer/QA/Tester isolation applies equally to any native method.


## T00–T02 execution progress — 5 October 2026

User approved this written plan and subagent-driven T00–T02 setup/coding batch. Source revision at fresh preflight: `93c3881898ec1e339f887f75964cd8a445ccad35`, branch `integration/t00-t02-foundation`, initially clean tracked/untracked working tree (only ignored OS metadata). This supersedes historical pending-execution stage text above for **T00–T02 only**; T03–T18 remain unapproved for execution.

### T00 scope and ownership contract

Allowed write paths: root package/workspace/lock/TypeScript/lint/Docker/Compose/example-env/ignore files, `apps/api`, `apps/worker`, `apps/web`, `packages/contracts`, `packages/tracker`, `tools/compatibility`, foundation test/boundary tooling as specified by T01–02. Sole application/config/test/lock writer: `/root/foundation_implementer`, acting Integrator/startup/migration writer. Root lead owns existing README/progress/evidence text only; no concurrent shared-source writers. Proposed worker path `apps/worker` is selected for this synthetic foundation, with explicit API application-port exports; actual durable dispatch remains T05, no false source-pipeline claim.

Repository/scope checks: `pwd`, `git status --short`, `git branch --show-current`, `git rev-parse HEAD`, `rg --files`, and actual AGENTS/README/contracts/architecture/UI/gates/role-map/plan inspected. No nested application instructions or existing manifests/code discovered. Root received a selected-environment skills update stating no skills currently available; this is root-local supplied context, not a claim about every agent or cloud catalog. Fresh reviewer contexts report listed/cloud skills. Each implementation/verification context must inspect its own actual relevant capabilities and report available versus unavailable accurately; no skill installation claimed. Original role guidance retained via local mandatory role map.

Docker Client 29.6.0 and Compose5.5.1 are available. Sandboxed `docker version` could not access socket; authorized reviewed read-only escalation succeeded: Docker Desktop4.93.0, Engine29.8.1, linux/arm64 server. Docker runtime/package network/download access and version metadata still require T01 evidence; no host fallback. Parent/sibling dependencies not inspected or repaired and never mounted/used.

Synthetic-only effects authorized: local isolated Compose project `automaktab-analytics-synthetic`, approved image/package downloads, build/install/test/real PostgreSQL fresh/upgrade fixtures and bounded worker/DB failure tests. No host application runtime/global install, inherited env/credentials, parent/sibling modification, external sink/money/auth/tracking, Gitstage/commit/push/PR/merge/deploy/cloud resource/live migration. API/web bind localhost; PostgreSQL container-only. Fresh DB service may use explicit public-safe nonproduction credentials with synthetic marker; never production credentials. Container socket not mounted.

T00 acceptance: fresh inspection-only R1/R2 reports for this scope, Architect/Adviser constraints assessment; no code execution certified. T01 RED→GREEN evidence + frozen exact stable compatible dependencies; TS7 discrepancy remains a real gate and downgrade needs documented approval. T02 acceptance is FOUNDATION_COMPONENT_READY, internal web smoke not product delivery; mandatory product Tester/AT/participant gate remains deferred/BLOCKED until actual required evidence. Tester may independently inspect available internal smoke via authorized black-box browser only, no diagnostic scripts; no consequential financial/outbound tests in this batch.

T00 reviewer assignments: fresh `/root/t00_correctness` and `/root/t00_security`, independently inspect scope and submit first reports before seeing each other; `/root/foundation_adviser` is additional. Subsequent code candidates require fresh task-scoped R1/R2 and independent non-author QA; identities/digests/results appended only after actual execution. Any content/config/evidence change invalidates candidate approvals. Stop T01/T02 on material compatibility/authorization/inherited-dependency failure while continuing independent read-only/docs evidence.


### Current T01/T02 checkpoint

The earlier automatic approval-context restriction was resolved by the direct 6 October user request to run. The same final Docker build and independent synthetic proof completed without a host fallback. T01 is **qualified compatibility PASS** on source `e3d7b9a647d5bb2fed44ca2c1abe13e29a4c88da926d7c5f60bd5926384e4941`, lock `9ce5172b035ae9dc849acb3fb45bfca530e79e266842d5daf78cb12b946a0344`, evidence `eb5873582b72e6e71a53532f40b17177fa4768d25f565c7a28ab2b2161c5101f`, image `sha256:00519b2c24cd29f56859ebacb4c02a294cac6ac397ad21b20941e68ecdb501c4`.

Independent `/root/t01_qa` passed clean frozen install, TS7 source/negative checks, lint/negative check, unit/build, Nest DI, PostgreSQL commit/query/rollback and Chromium smoke; exact source hashes/lock unchanged. Strict `skipLibCheck:false` failed: 70 Drizzle declaration errors, including PostgreSQL declarations. Diagnostic-only TS6 produced the same 70 file/line/code errors with no compiler-specific difference; no compiler downgrade occurred. Integrator retains TS7 and existing `skipLibCheck:true` with explicit reduced assurance and focused source/runtime checks for each adopted Drizzle API. This is compatibility of the tested consumed pipeline, not unrestricted dependency declaration compatibility. ESLint9 maintenance limitation and linux/arm64-only reproduction remain recorded. Adviser agreed to the qualified ruling; fresh R1 `/root/t01_correctness` and R2 `/root/t01_security` independently PASS and reassessed the final evidence-only key above. Strict declaration checking remains FAIL; product Tester/AT remains NOT RUN/BLOCKED.

T02 source ownership transferred exclusively to fresh `/root/t02_implementer`; root continues to own README/progress documents. The compatibility fixture is frozen and retained. T02 implements only the synthetic foundation and registered checks in the approved paths. No T03+ execution or product delivery is authorized. See [review record](implementation-execution-plan-review.md) for the historical block and current exact-key outcomes.

T02 preparation capability update: root successfully called Context7 NestJS library resolution and documentation query in this resumed context; current official Nest documentation corroborates explicit shutdown hooks. This is documentation access, not installed runtime tooling or package-version proof. Superpowers subagent-driven-development and verification-before-completion instructions are available/read; writer read TDD main instructions but its linked supplemental test-writing resource was unavailable. No capability installation is claimed. Architect accepted provisional synthetic technical bounds: 1 MiB means 1,048,576 body bytes, 100 events/batch, 1,000 queued events, page size100, at most three retries after the initial transaction attempt, only recognized transient DB conflicts and callbacks without external effects. These future consumer bounds establish neither capacity nor financial policy; unused consumers remain unimplemented in T02.


### T02 final component checkpoint — 6 October 2026

T02 is **FOUNDATION_COMPONENT_READY** on source `0b281a027db650bccc09e7cc197cd9cc14b91c3d46d0a86d194f6685806050a8`, combined evidence `bb16c8ae123e196f4b4ffc9ab65558738dfa2e9429fd616feb689712fea4566b`. Sole implementer authored the foundation; fresh non-author QA passed 9 unit/8 integration/3 browser tests, focused dispatcher controls, actual DB outage/recovery and worker restart. Independent R1 and R2 PASS bind the exact candidate; Adviser supports component readiness. The migration partial-commit finding is fixed and regression-tested with genuine RED→GREEN evidence. Original complete test-first workflow is not established and is not claimed.

The local preview remains at http://127.0.0.1:18517/ with same-origin health readiness. It is an internal synthetic developer fixture; DS, founder auth, analytics, schools, tracker and billing remain unimplemented. Tester product verdict remains NOT RUN/BLOCKED, without an available black-box browser/AT capability. See the [final audit record](implementation-execution-plan-review.md#t02-final-component-readiness--6-october-2026) for exact commands, source inventory, failures and limitations. T03 is the next planned bounded phase, not started and requiring new execution approval. Cloudflare integration, publication and deployment remain out of scope.

### Full implementation resumed — 8 October 2026

The user explicitly requested continued implementation until the system works and authorized needed access. T03–T18 execution is now authorized within the confirmed platform-owner scope. The preceding checkpoint and its unimplemented-module statements are historical. The approved decision set is recorded in the design spec's 8 October addendum. No real founder, rates or infrastructure identity is guessed.

Work continues directly in the existing integration checkout, preserving previous WIP. Root owns shared contracts, migrations, configuration, HTTP integration and reporting; separate implementers own collection/schools/worker, billing and the scoped CRM source adapter. A completed frontend candidate has transferred to integration verification. Beads contains epic autodrive-analytics and T03–T18 dependency-linked tasks; no product task is closed solely on an author's focused pass.

Current verified component evidence includes exact-string whole-so‘m contracts, founder session/CSRF/logout against disposable PostgreSQL, durable telemetry admission/dedup/privacy, source baseline and ordered projection, competing worker processing, canonical alias revocation blocking, whole-day billing calculations, leap-year periods, reviewed fixed invoice close/immutability, receipt allocation/reversal and paid invoice correction. A real Nest HTTP tracer verifies unauthenticated rejection, cookie-authorized traffic reads and cross-environment denial. The integrated Docker build succeeds; all workspace tests, browser acceptance, operational recovery and fresh reviews must still bind a completed combined candidate. Live deployment is not established.

### Current verification checkpoint — 8 October 2026

- Source adapter: independent verification-only QA passed65 units and17 real PostgreSQL cases, production/full TypeScript and focused lint. Runtime-role deletion guards, identity-only mutation rejection and actual Prisma array/interactive rollback are covered. Source migration `daff32c264cab21c57c5e8be6dfe9429092fab141ef548c0eae0e719804db321` and E2E `f86ea0502a1d66bb3f7da9ced97c69be584e9d937d004314e6b4410cf4c28e1e` received bounded R1/R2 source PASS; this is not whole-product approval.
- Billing author:25 focused checks passed (19 real PostgreSQL,5 calculation,1 anniversary). Cancellation retains excess as noncash school credit; reviewed allocation, corrections and receipt reversals preserve the separate pools. R1 accepted the original arithmetic fix by inspection. Later HTTP body/date recovery fixes have new regression cases and await runtime verification.
- Frontend author:15 unit and8 browser regressions, type/lint/build passed; actual synthetic contract→invoice→receipt→credit-correction→full-reversal flow passed. This used the preceding API candidate. The newly authored noncash-credit browser flow is NOT RUN. A fresh black-box Tester has not approved the combined candidate.
- Root transport calendar regression reproduced the old RangeError and current6 pure contract checks passed without application startup or database access. A generated founder-protected OpenAPI3.1 route/schema document is implemented; its HTTP regression remains pending.
- Independent finance QA passed focused lint/typecheck with16 hashes unchanged; the29-case database-writing suite was rejected by automatic approval review before execution twice. The reviewer cited the earlier read-only restriction and did not accept the later broad all-access instruction as precise authorization for app startup and synthetic writes. An explicit human question for those exact local Docker/test-database effects is pending. No workaround or product PASS is claimed.

The local stack is an older synthetic candidate, with one intentionally recorded school1 obligation and reversed receipt from the successful browser tracer. Source refresh, new candidate startup, migrations, further database-writing tests and operational fault/restore/load checks are on hold for that exact approval. Live founder identity, deployment endpoint and approved live retention/cutover inputs are not guessed. Static inspection and unaffected checks continue.

Independent static/pure QA subsequently passed workspace boundaries, lint, TypeScript and38 unit checks without networking, application startup or database access;96 file hashes and the path set remained unchanged (manifest `9e0f9edcd159b11f7c5ef37b2b146e3926b2bd898b5849f77d300bb74802cd61`). Later independent reviews found a production SSO audience mismatch, duplicate observations for regenerated event IDs, inconsistent acquisition scope and a void-preview documentation mismatch. Root corrected these four findings and authored regressions. These edits invalidate that manifest; exact-candidate re-review and unaffected pure/static verification are in progress. The new SSO/replay/acquisition PostgreSQL regressions remain NOT RUN.

On that revised snapshot, independent pure QA reported40/40 unit checks plus boundary/TypeScript PASS, and one lint error for the new audience control-character regex. Root replaced the regex with character-code checks. The reviewer also found that the reporting fixture quarantined a conflicting version before asserting fresh results; root moved that conflict to the end and added an explicit unknown-result check after quarantine. No runtime regression has been executed. The Docker socket is present but the daemon is currently unreachable, so final lint/build and exact-candidate verification cannot yet be repeated. Fresh inspection-only R1/R2 contexts continue frontend/tracker/host review. The code index was updated successfully; its TSX parser reported partial extraction for three frontend files, which is an index limitation and does not replace TypeScript or browser verification.

The host review found an IPv6 synthetic mismatch between the marketing adapter and CSP; root aligned the CSP with the adapter's localhost predicate. The new first-party SDK remains opt-in and respects DNT/GPC. Existing Umami fallback when no valid new SDK configuration exists retains prior host behavior and is outside these adapter changes; its consent/privacy policy is an inherited rollout decision, not a global privacy PASS. No new live tracking has been activated.

Later independent findings are repaired: a new command rejected behind an older unresolved intent now receives a durable non-commit outcome and can be acknowledged before rediscovering the original intent; replaying a historical lead creation after its school link no longer quarantines identical content; school-scoped acquisition uses the authoritative lead link. Financial lists and school/contract selectors use bounded 50-row pages; school selectors support search, and selections are retained across pages. Receipt allocations survive invoice-page changes; actual finance scope changes reset forms and reviews. Journeys has a scoped daily trend with unknown days left null, and traffic/journey records remain visible alongside the trend. CRM static route names survive the SDK boundary, and separator-formatted phone campaign labels are rejected in both hosts and the SDK. These changes have scoped R1/R2 inspection PASS; database/browser regressions remain NOT RUN.

Docker read-only access recovered. Fresh nonauthor QA first found a missing JSX closing tag in root's AnalyticsView change; boundaries and lint FAILED on that snapshot. Root added the missing outer container close, and both reviewers reassessed the repair. On the corrected snapshot, independent network-none Docker QA passed `pnpm check:boundaries`, `pnpm lint`, `pnpm typecheck`, `pnpm test:unit` (45 tests in 10 files) and `pnpm build`. All 102 input hashes stayed unchanged, digest `beb14f9b61089ae63197f3793254443fbd9938cccf9e02cf6f5e75d3a2df9aee`. The unchanged four host adapter files also passed 18 isolated mock tests and focused lint. Type checking retains `skipLibCheck:true`; this is offline component evidence, not running-system acceptance. See the [final offline review checkpoint](implementation-execution-plan-review.md#full-product-offline-review-checkpoint--8-october-2026).

Subsequent source inspection found that the global branch selector ignored the school detail's cursor after its first100 branches. It now uses the existing50-row branch API with previous/next controls, bounded selected-branch retention and an explicit unknown-name fallback for off-page URL selections. School/environment changes reset the roster context, superseded responses cannot replace the new scope, and the actual toolbar refresh refetches both school and branch selectors. The controlled browser regression covers102 branches, later-page selection, scope/navigation changes and a changed roster refreshed through the toolbar. Both independent reviewers gave scoped inspection PASS; the browser regression is NOT RUN.

The collector also rejected eleven static CRM route names already preserved by the SDK. Root aligned its existing static allowlist without accepting raw identifiers, query strings or fragments. A regression connects the real SDK to the public collector and PostgreSQL, checking22 sanitized list/detail paths and three privacy rejections. Both independent reviewers gave scoped inspection PASS; this PostgreSQL regression is NOT RUN.

Fresh nonauthor `/root/analytics_final_offline_qa` passed the same five offline commands on the combined four-file repair:45 unit tests in10 files, boundaries/lint/TypeScript/build PASS. Its explicitly recorded protocol used31 read-only mounts and106 analytics inputs, with before/after digest `3f66fa84e795981f4e8a0c122fbdd657c0c616925abfd464fb04f64d8162a072` and no input drift. This is a new manifest protocol; no equality or ancestry with the preceding102-input snapshot is claimed. The unchanged host adapter tests were not repeated. Root updated the code graph after these repairs; four TSX partial-extraction warnings remain an index limitation. See the [follow-up review record](implementation-execution-plan-review.md#branch-roster-and-collector-compatibility-follow-up--8-october-2026).

The latest read-only Docker inventory showed the analytics services stopped. Startup, synthetic database-writing verification, integration/E2E and operational recovery remain pending the exact human approval described above; the two previous automatic-review rejections have not been bypassed. Founder identity, real school terms, live cutover/privacy inputs and deployment target remain separately unresolved. No whole-product Tester, release or deployment PASS is claimed.
