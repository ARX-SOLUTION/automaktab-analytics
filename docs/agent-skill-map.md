# Agent roles and skill setup map

## Status

This is a self-contained summary of project-approved team guidance for this repository. These role briefs and skill mappings are documentation, not installed agents, installed skills, executable policy, or verified access. No credential, global configuration, or machine-specific integration is included.

Before coding, inspect the selected executor's actual skill catalog and relevant repository skill directories. Record what is available, what needs an approved installation, and what remains unavailable. Use only relevant instructions and keep their licenses/provenance intact. Do not assume a catalog entry on one machine exists on another.

## Required roles

| Role | Accountable outcome | Boundaries and handoff |
| --- | --- | --- |
| Coordinator | Bounded tasks, dependency order, file ownership, decisions, evidence register | Does not convert a plan into permission or override a blocking review |
| Requirements Research | Current source facts, decision questions, metric/business definitions | Distinguishes observed facts, proposals, and unresolved choices |
| Architect | Module boundaries, public contracts, trust/concurrency model | Avoids speculative complexity; owns interface decisions with the designated writer |
| UX | Interaction flows, light/DM Sans specification, token/asset manifest, accessibility | Treats error/interruption/financial states as core requirements |
| Frontend Implementer | React features and UI tests in assigned paths | Consumes agreed contracts; does not invent billing/auth semantics |
| Backend Implementer | NestJS use cases, adapters, API contracts and backend tests | Keeps trust boundaries and source ownership intact |
| Data/Billing Implementer | Drizzle schema, projections, exact calculations, ledger invariants | Owns financial schema/migration changes through one-writer coordination |
| QA/Test Implementer (authoring mode) | Fixtures and test tooling in assigned files | Writing tests is implementation; cannot independently approve or verify their own candidate |
| Verification-only QA | Execute an approved command allowlist on the frozen candidate | Fresh task-scoped context, not a candidate author; no source/test/fixture/config edits |
| Correctness Reviewer | Adversarial requirements/domain/integration review | Independent of the implementation author; records findings and exact reviewed candidate |
| Security/Data Reviewer | Adversarial auth, privacy, ownership, concurrency, recovery review | Independent of the implementation author and distinct from the other reviewer |
| Tester | Black-box UI checks and reproducible user-visible results | No source/test/fixture/config edits or script execution; exact-candidate pre-delivery verdict |
| Adviser | Challenge assumptions, complexity, missing decisions, and residual risk | Advisory perspective; cannot waive evidence, permissions, or failed tests |
| Documentation | Accurate README, decisions, operations, and handoffs | Separates proposed, implemented, verified, published, and deployed states |
| Release Integrator | Controlled integration and final-revision verification | Sole writer for integration/shared files as assigned; no unapproved merge/deploy |

For every implementation task, assign one writer plus both independent reviewers. Assign Tester and Adviser as additional responsibilities. A separate QA implementer can prepare test files in parallel, but that work itself needs the same independent review. Do not collapse the implementer and reviewer roles to create apparent approval.

## Mandatory role isolation and execution boundaries

For each implementation candidate, create **fresh task-scoped Correctness (R1) and Security/Data (R2) review contexts**. Neither reviewer authored the candidate. Each independently inspects the same frozen candidate, requirements, and evidence and submits an initial report **before seeing the other reviewer's findings**. The Coordinator may reconcile findings only after both initial reports exist. Reassessment stays bound to the new exact review key.

**R1 and R2 are inspection-only:** they never edit candidate files or execute project/package code, including install hooks, builds, lint, tests, migrations, or diagnostic scripts. If execution evidence is missing, request it from a separate fresh **verification-only QA** context that did not author the candidate. Give QA an explicit command allowlist, frozen revision, synthetic fixture/environment, expected permitted effects, and output contract. QA may run only those approved commands and must not edit source, tests, fixtures, dependencies, configuration, or snapshots to make a result pass.

Keep **QA authoring** and **QA verification** as separate task modes and contexts. An author of tests, fixtures, scripts, or application code is a candidate author and cannot certify that same candidate through a verification role. Failed checks return to the designated writer; a fix creates a new candidate/key, new verification evidence as needed, and reassessment by both reviewers.

**Tester is black-box:** exercise the rendered application through approved browser/device interactions using synthetic records. Do not edit source/test/fixture/configuration files or author/run project or diagnostic scripts. Tester checks visible outcomes, navigation, accessibility, and recovery against the specified IDs. Before any consequential test action, independently verify that mail/messaging/payment/storage integrations use authorized local/synthetic sinks and cannot reach real recipients or move real money. If sinks or side effects cannot be verified, stop that test as BLOCKED; do not assume a “test” label makes it safe.

For implemented product-facing work, Tester must issue **PASS on the exact candidate before delivery**. Missing or failed mandatory checks are BLOCKED. Post-publication smoke is additional. Tester and Adviser do not replace R1/R2 or verification-only QA. Even a mechanically combined integration candidate receives **both independent exact-candidate reviews and verification**, plus the applicable Tester verdict; approvals on component branches cannot be treated as final integration approval.

## Work ownership

Before parallel work, the Coordinator records:

- Task goal, allowed repository and paths, input contracts, acceptance tests, and stopping condition
- One writer for every file set and the coordinator for cross-area changes
- The shared-contract revision each implementer consumes
- Two distinct independent reviewers, Tester, and Adviser
- Required decisions and actions that remain approval-gated

One person/agent writes shared contracts, migration ordering, dependency manifests/lockfile, and design tokens at a time. Implementers request changes to those files instead of racing edits. Reviewers return findings; the assigned writer makes fixes unless ownership is explicitly handed over.

## Review key and invalidation

Review the same exact candidate, identified by immutable revision where possible. A review key records the repository, base revision, candidate commit/tree or immutable patch digest, relevant generated artifacts, contract/design versions, dependency lockfile, verification environment/configuration, and **test/visual evidence manifest digest** that affect the claim. During uncommitted work, capture the full candidate diff/content digest so “latest files” cannot silently change beneath approval.

Both reviewers must report against that same review key. **Any candidate or review-key change invalidates both approvals.** Both reviewers must reassess the new exact snapshot. A reviewer may use a documented scoped/no-impact reassessment where justified, but an old approval cannot simply carry forward. New test or visual evidence must also correspond to the final candidate used for completion claims.

Each review includes findings by severity, the violated requirement/invariant, a reproduction or evidence reference, a requested resolution, and unresolved risks. Fixes are followed by affected checks and both reviewers' reassessment. Tester reports actual integrated results and must issue exact-candidate PASS before delivery of implemented product-facing changes; unverified mandatory UI criteria block delivery. Post-publication smoke is additional. Adviser reports remaining assumptions or complexity concerns. Neither can erase a blocking finding.

## Proposed skill mapping

The names below are catalog candidates to inspect in the selected environment. Their appearance here does not install or grant access to them.

| Work | Relevant skill families/candidates | Required output |
| --- | --- | --- |
| Requirements and design decisions | Brainstorming, writing plans, product-design ideation/audit | Approved scope, decision log, interaction/test contracts |
| Parallel task coordination | Dispatching parallel agents, subagent-driven development | Disjoint ownership, shared contracts, review assignments |
| Implementation discipline | Test-driven development, systematic debugging | Reproduced failure, focused change, executable evidence |
| React performance and components | React best practices, applicable design-system guidance | Maintainable components, measured behavior, no unrelated framework switch |
| UI/UX refinement | Impeccable or equivalent design/audit workflow; product-design audit | Light/DM Sans consistency, accessible states, responsive evidence |
| Backend/data work | Official NestJS/Drizzle/PostgreSQL documentation; available context/documentation lookup | Version-matched implementation and transaction proofs |
| Browser verification | Available browser QA/verification workflow | Actual rendered-flow checks with screenshots and reproductions |
| Review and release | Requesting/receiving code review, verification before completion | Two exact-candidate reviews and final-revision checks |
| Documentation | Appropriate documentation workflow and repository writing conventions | English, self-contained, public-safe, status-accurate docs |

Use a skill only when it fits the chosen stack and task. For example, a Next.js-specific setup must not replace the confirmed Vite frontend merely because such a skill is available. A generic database example does not establish financial correctness. Tool instructions and project safety/authorization boundaries remain binding.

## Setup acceptance before claiming readiness

1. Inspect the actual executor and record the available catalog/repository skill paths
2. Select the minimum relevant skills for each role; read their current instructions and check compatibility
3. Confirm required installation/configuration authority before changing the environment; never embed MCP credentials or personal machine settings in this public repository
4. For proposed custom skills, review content and provenance before installation. Keep reusable guidance separate from personal history and project secrets
5. Verify that each selected role can access its required files and tools without expanding scope
6. Run a small synthetic task through writer → two independent reviews → Tester → Adviser → integration verification
7. Report installed/available/blocked states accurately; documentation of a role or skill is not runtime activation

## Task handoff template

Use a short self-contained handoff with these fields:

- **Goal and output:** the concrete behavior or artifact
- **Scope:** repository, branch/base, allowed paths, excluded external actions
- **Inputs:** current contracts, decisions, relevant docs, and synthetic fixtures
- **Writer and dependencies:** owned files and prerequisite work
- **Acceptance:** exact behavior, negative cases, and evidence required
- **Review:** two independent reviewers, candidate/review key, Tester, Adviser
- **Decisions/blockers:** what must not be guessed or activated
- **Result:** changed files, final candidate, checks passed/failed/not run, findings, and next step

Report useful findings first. Stop only the dependent work when a decision or permission is missing; continue independent authorized work. Do not describe unperformed tests, missing skills, or a planned installation as completed.
