# DS04 — Component Anatomy and Behavior

Version: `automaktab-dark-1.0-draft`; proposed handoff. [DS00](DS00-overview.md) sets system authority. [DS05](DS05-controls-states.md) specializes the four required control families. Proposed components consume versioned transport contracts and semantic design tokens; no runtime component exists yet.

## Anatomy

| Component | Required anatomy and information |
| --- | --- |
| Page header | Heading, purpose/context, safe school/surface/date scope, persistent sample label, relevant primary action |
| Filter band | Labeled date/timezone/school/branch/surface/environment; active count, reset, clear applied scope |
| Metric | Label, value or explicit unavailable state, unit, definition, comparison basis, data-through/coverage and drilldown |
| Chart | Title, axes/units, legend with markers/text, safe tooltip, synchronized text/table alternative, coverage gaps |
| Data table | Caption/context, real headers/cells, sort semantics, bounded cursor pages, row action names, currency/units |
| Source status | Oldest contributing boundary, cutover/checkpoint, gaps/blockers and safe next action; never generic green “healthy” on unknown data |
| Field | Persistent label, control, optional units/affixes, helper/required state, associated error |
| Review panel | School/currency/period/business timezone, basis/revisions/source proof, consequences, blockers, deliberate confirm/cancel |
| Dialog/drawer | Accessible title/description, initial focus, contained modal keyboard behavior when modal, cancel, focus restoration |
| Financial history | Immutable original, linked correction/reversal, actor/time/reason and separately refreshed current balances |

## Proposed component contracts and ownership

FE-01 owns shared primitives. FE-02 owns session/nav/route/filter behavior, FE-03 read-state/format/query adapters, FE-16 command intent/recovery. Feature owners consume these; they do not create another shared component library.

Proposed state interfaces for later contract freeze: `DataViewState` = loading/ready/empty/unknown/stale/partial/error/denied; `CommandState` = idle/reviewing/submitting/unknown/committed/conflict/blocked. They are presentation states, not proof of source trust, authorization or financial commit. Choose one controlled state source; avoid dual internal/external value or duplicated query-cache state. IDs, request results and permissions come from the shared API contract.

Loading/error/disabled are orthogonal flags where applicable; define precedence. Permission/session denial prevents protected rendering regardless of cached success. UNKNOWN financial intent takes precedence over edited-form validity. Loading does not erase a persistent server result without a declared refresh state. An error label cannot silently overwrite an in-progress/unknown commit state.

## Data-state behavior

| State | Visible content / action / accessibility |
| --- | --- |
| Initial loading | Stable layout and described progress; no plausible numeric placeholders; one polite status |
| Refreshing same scope | Retain labeled prior result/data-through; progress; user can navigate |
| Changed scope loading | New scope label with loading; old values never appear beneath it |
| Empty | Explain no data/no matches separately; offer safe filter reset or scoped action |
| Known zero | Show zero with unit/definition only if confirmed complete metric input permits it |
| Unknown/unavailable/not-applicable | Named distinction/reason, no fabricated zero; unknown is not an empty dataset |
| Stale/partial | Retain useful coverage-labeled data, show limiting source/time and recovery; do not silently imply full total |
| Error/offline/rate limited | Safe reason, retained safe input, bounded retry with request ID/Retry-After where applicable |
| Denied/expired | Clear protected caches, close streams; no leaked school details; fresh authorized session required |
| Sample | Persistent header/context label and relevant export annotation |

Every screen records applicability for success, conflict, canceled/interrupted, fatal unavailable and unknown outcome too. N/A requires reason. Old response/request keys cannot overwrite newer filters. Refresh, links and Back/Forward restore normalized safe filters; changing school visibly clears incompatible branch. Session/account change clears protected state. No history traversal submits a mutation.

## Financial review and recovery

Invoice preview is nonposting; Close remains disabled with accessible blocker text until source/policy/readiness is satisfied. Server recomputes under its guard; client totals never establish authority. Only committed server response creates a success/paid/closed state. Stale preview requires changed-basis explanation and new deliberate review, not automatic retry on updated hash.

Receipt review shows received, allocated, credit and resulting outstanding per currency. Conflicts reload and require review; never silently reduce allocations. Original intent/body/key remains stable on timeout. UNKNOWN/in-progress blocks a replacement key even after edits, navigation or reauthentication. Resume/status, actor binding, privacy, retention and definitive non-commit contract must be frozen before implementation. A canceled browser wait does not undo a server action.

Reversal review comes from the server: actor/company/payment/operation/reason-bound preview, hash, expiry and ledger revision, exact allocations/credit/balance consequences. Any relevant intervening write makes a fresh command stale. Reconfirm changed consequences with new intent only after the original uncertain operation is resolved. Authorized exact committed replay returns the original outcome even if its own success advanced revision; display current balances separately. No cash refund is claimed. Invoice correction remains a distinct policy-gated append-only workflow.

## Interaction, focus and live updates

Use native button/link/input semantics. Inline detail precedes a modal when practical. Opening a review dialog focuses its heading/intro for lengthy consequences, or its safe first control for a short form; do not autofocus a destructive confirm. Escape/cancel closes only when safe and restores trigger focus. Submission pending/UNKNOWN has explicit close/navigation behavior and persistent recovery; do not create a keyboard trap through an uncloseable generic spinner.

Sorting updates `aria-sort`; selected navigation uses `aria-current`. Errors associate with fields and a summary when multiple fields fail; focus the summary after failed submit. A live feed has pause/inspect where updates disturb reading; bounded rows, understandable reconnect/stale status and batched polite announcements. Replays deduplicate; expired cursor resets; session expiry closes stream. Charts expose task information without hover, color or pointer dependence.

## Acceptance

Each implemented flow maps to applicable UX-B01–08/A11Y-01–10/UX-R01; do not substitute a static component story for actual API/worker/product integration. Component-stage checks may enable internal staging; required paired journey checks remain NOT RUN until its named combined candidate. Delivery still needs Tester PASS and both independent current reviews. Participant UX-U01–03 stays a separate launch gate. Synthetic sink verification precedes consequential browser tests.
