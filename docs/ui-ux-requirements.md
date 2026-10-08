# UI/UX requirements

## Direction and design status

Build an original dark deep-gray/slate dashboard with tech-blue accents and DM Sans, restrained semantic color, clear hierarchy, compact but readable data views, and generous separation between tasks. The 5 October 2026 user direction supersedes the earlier light direction; use the versioned [DS00–DS05 specification](design/DS00-overview.md). The influence is ease of scanning and understanding; the product needs its own composition and assets. Earlier palette instructions are historical; the latest user direction is authoritative.

This document specifies behavior and acceptance criteria. Review-ready DS documents now exist; no runtime design token file, licensed font asset, screen implementation, or visual QA result is delivered by this documentation package. Create and approve one versioned design-token/asset manifest before broad UI work. Record source/licensing of fonts, icons, and other assets. Do not claim an earlier prototype is a backend-connected production React application.

## Users and core journeys

The confirmed audience is the internal Automaktab founder and authorized team, not school users. A proposed least-privilege bootstrap admits only an explicitly confirmed founder identity until team roles and grants are approved. General operational developers and school owners do not inherit access. These documents activate neither identities nor permissions.

The dashboard must support these five journeys; success is measured by the criterion IDs, browser scenarios, and participant tasks below:

1. See whether acquisition, usage, and learning are improving, with clear units, dates, segments, and freshness
2. Move from a summary to a school, branch, or relevant detail without losing filter context
3. Review an individual school's contract and source-complete invoice preview before closing a period
4. Record a received payment, understand its allocation and remaining credit, and correct a receipt transparently
5. Identify overdue invoices by amount and days, then record payment or acknowledge the in-app reminder

## Information architecture

- **Overview:** a small set of well-defined metrics, trends, attention items, and source-status summary
- **Traffic and acquisition:** visits/sources and the platform visit → lead → school → first paid invoice path
- **Funnels:** explicitly named definitions, conversion windows, steps, and revision context
- **Live:** bounded recent activity with a clear live/reconnecting/stale status
- **Usage:** feature and authenticated activity metrics, separate from raw pageviews
- **Learning:** official outcomes and activity, with practice separated from school learning
- **Schools:** searchable list, school detail, branch breakdown, contract, invoices, and opaque billable-subject detail
- **Billing:** contracts, preview/close, invoices, receipts, allocations, credit, and correction history
- **Reminders:** outstanding amount, due date, numeric overdue days, and action
- **Diagnostics/settings:** source freshness, gaps, policy status, and audit; no misleading activation controls before their workflow exists

Avoid overwhelming the overview with every possible metric. Each card needs a useful decision or drill-down destination. Navigation names, metric units, and financial terms must remain consistent across pages.

## Visual system

Define tokens for canvas/surface/elevation, text hierarchy, borders, accent, semantic status, spacing, type scale, radius, and focus states. Semantic status must not depend on color alone. Danger red is reserved for meaningfully overdue/error states and must be paired with text or an icon/label.

Use DM Sans for the interface with a legible system fallback. Financial values, dates, table columns, and units should align consistently; use tabular figures where available. Avoid decorative gradients and crowded cards that weaken readability. Charts should match the calm dark interface and retain contrast for multiple series.

Document the current token/asset manifest version in visual review evidence. Changing the design system is a coordinated change through the designated token writer, not an ad hoc theme per page.

## Filter behavior

Use a shared date interval, display timezone, school, branch, surface, and environment model. Persist safe filter state in the URL so refresh, links, and Back/Forward are understandable. Validate it before querying. A branch must belong to the chosen school; changing school clears an incompatible branch and makes the change visible.

Every normalized filter participates in the query key. Late responses for an older selection cannot overwrite current results. Keep old data only when it is clearly labeled as refreshing for the same context; never place it beneath new-filter labels. Distinguish display timezone from contract billing timezone.

Filter and navigation actions work with keyboard and narrow screens. A collapsed filter panel must expose the active selection count and a predictable reset. Back/Forward restores filter state without duplicate mutations or unexpected overlays.

## Data-state contract

| State | Required presentation |
| --- | --- |
| Loading | Stable layout, descriptive progress, no fabricated metric value |
| Empty | Explain that no matching data exists and offer the relevant filter/action |
| True zero | Display zero only where the metric definition supports it |
| Unknown/unavailable | Use explicit unavailable text; do not convert to zero |
| Stale | Retain useful last-known data with data-through time and refresh status |
| Partial | Identify missing coverage/source and how it limits the metric |
| Error | Concise explanation, safe recovery, and request ID where useful |
| No permission | Clear access state without leaking protected school/customer details |
| Demo/fixture | Persistent “Sample data” labeling on the screen and relevant exports |

Queries show metric units, definition context, covered interval, and freshness. A recent refresh timestamp is not evidence that source data is current. Composite metrics reflect the oldest contributing source. Charts need accessible summaries or tabular equivalents, meaningful axes, understandable units, and no color-only distinctions.

## Financial presentation

- Label the domain as Automaktab platform billing so it cannot be mistaken for school tuition
- Show billed amount, collected cash, outstanding balance, unallocated credit, and normalized recurring revenue separately
- Show currency consistently; do not sum different currencies into an unlabeled total
- Show the plan's unit explicitly: fixed month, fixed annual period, or per-active-student month
- Provide school, branch, and subject breakdowns where relevant, with totals that reconcile
- Label fixed-fee branch/subject breakdowns as management allocations, not extra charges
- Show contract/policy revision, billing period, business timezone, due date, and source completeness in review details
- Keep unavailable/blocked calculations visible as blockers rather than showing a plausible guessed total

## Invoice preview and close

The user selects a permitted period, reviews a non-posting preview, and sees both the total and its basis. Show eligible subjects/days, branch allocation, source coverage, and policy/contract revision. If a policy is unconfirmed or source data incomplete, explain the specific blocker and keep Close disabled with accessible explanatory text.

Close requires a deliberate action from the reviewed preview. Disable duplicate submission while an intent is unresolved, but preserve the original idempotency key across network retries. Never display success until the server confirms the committed invoice.

If the server reports a stale hash, show that inputs changed, fetch a new preview, and require a new review. Do not silently close the updated amount. After success, replace the preview with the immutable invoice and invalidate affected query keys. Reopening a closed period shows the existing invoice rather than encouraging another close.

## Receipt entry and allocation

Explain that the form records money already received. It does not transfer money or charge a card. Fields need explicit units, valid dates, clear methods, safe optional references, and allocations limited to the selected school's eligible invoices in the same currency.

Show received, allocated, remaining available credit, and each invoice's resulting balance before submission. A partial payment remains visibly partial. Prevent a stale client balance from appearing authoritative. If a concurrent change causes an allocation conflict, reload and require review rather than silently altering allocations.

On a lost response, retain the same intent/key and show an uncertain/in-progress state until reconciled. Do not offer a fresh duplicate receipt as the default recovery. Show committed server balances after success. Potential duplicate external references need review context, not a claim of automatic certainty.

## Reversal and invoice correction

Receipt reversal is an explicit correction with a reason. Load the server-issued reversal preview and show its receipt amount, affected active allocations, credit changes, and resulting invoice balances. Bind submission to that reviewed preview/hash and ledger revision as specified in [API contracts](api-contracts.md#7-manual-receipts-allocations-and-reversals). Make clear that no cash refund is performed. The original receipt and reversal remain visible in the audit history.

If allocations or affected balances change after confirmation, or the preview expires, `REVERSAL_PREVIEW_STALE` means no reversal was committed. Fetch a new preview, highlight changed consequences, and require new explicit confirmation with a new intent/key. Do not silently adopt the new allocations/balances. An uncertain response retries the exact original body/key; a committed replay shows the original reversal result, then separately refreshes current balances. A disabled button or database lock alone does not preserve the consequences the user reviewed.

Invoice adjustment/credit/void is a different workflow and stays unavailable until its product contract is agreed. Do not present an editable closed invoice or a destructive reset control. Any future correction must show its links, balance consequences, actor, and reason.

## Overdue and reminders

Use a danger-colored badge plus readable text such as “Overdue: 7 days,” together with the due date, outstanding amount, school, and payment action. The number comes from the confirmed business-local policy. Fully paid or invalidated invoices cannot remain incorrectly overdue.

Acknowledgment is labeled as seen/acknowledged, not paid. Reversals may reopen an overdue balance and should explain the change. In-app reminders do not imply that an email/message was sent. No UI flow automatically suspends a school or blocks service for overdue invoices.

## Accessibility and responsive acceptance

**Project target: WCAG 2.2 Level AA for applicable content and complete processes.** This is an engineering acceptance target, not certification, a claim of current conformance, or legal advice. The shortlist below does not replace assessment of every applicable A/AA criterion. No accessibility checks have run on an application yet. [W3C WCAG 2.2](https://www.w3.org/TR/WCAG22/)

| Criterion ID | Mandatory acceptance and evidence |
| --- | --- |
| A11Y-01 | Measure rendered text/background contrast: at least 4.5:1 for ordinary text and 3:1 for qualifying large text, including applicable states. Large text is at least 18 pt or 14 pt bold. Record criterion-permitted exceptions explicitly. [W3C text contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) |
| A11Y-02 | Measure at least 3:1 against adjacent colors for applicable visual information needed to identify controls/states and meaningful graphics. Document any criterion-permitted exception; checking token colors alone is insufficient. [W3C non-text contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html) |
| A11Y-03 | Pointer targets meet 24 × 24 CSS pixels or a documented WCAG exception: qualifying spacing, equivalent control, inline text, unmodified user-agent control, or essential presentation. Measure the actual hit area. Prefer larger important touch controls without mislabeling that preference as the AA minimum. [W3C target size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) |
| A11Y-04 | Text resizes to 200% without lost content/functionality, subject to the criterion's captions/images-of-text exceptions. Test actual labels, fields, balances, and errors. [W3C resize text](https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html) |
| A11Y-05 | Vertical content reflows at an effective width of 320 CSS pixels without loss or two-dimensional page scrolling. Essential two-dimensional content may use a justified exception; surrounding controls/text must still work. Tables do not excuse clipping unrelated page content. [W3C reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html) |
| A11Y-06 | All required actions work by keyboard with logical order, visible focus, appropriate semantics, and no unintended trap. Custom widgets define and demonstrate their keyboard model. [W3C keyboard](https://www.w3.org/WAI/WCAG22/Understanding/keyboard.html) |
| A11Y-07 | Author-created sticky/overlay content does not entirely obscure a focused component; the design should keep it fully visible. Test dialogs, banners, drawers, and narrow-screen combinations. [W3C focus not obscured](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html) |
| A11Y-08 | Verify names/roles/states, labels, heading/reading order, field-error association, and appropriate dynamic status announcements with the agreed browser/assistive-technology matrix. Announcements must not repeatedly interrupt reading |
| A11Y-09 | Dialogs have an accessible name, deliberate initial focus, contained modal keyboard interaction, cancellation, and focus restoration. Charts expose the task-relevant information through synchronized text/table alternatives; status and series are not color-only |
| A11Y-10 | Assess remaining applicable A/AA criteria, including text spacing, hover/focus content, timing, flashing, input alternatives, accessible authentication, error prevention, and media if present. Record applicability and evidence rather than treating this shortlist as exhaustive |
| UX-R01 | Verify 360, 768, 1280, and 1440 CSS-pixel layouts, long labels, large synthetic values, reduced motion, and touch/keyboard paths in addition to the 320 CSS-pixel reflow check |

### Browser and assistive-technology matrix

Confirm the supported matrix from authorized user needs before implementation delivery. A proposed initial matrix is Chromium desktop with keyboard, Firefox desktop with NVDA on Windows, Safari desktop with VoiceOver, and a mobile Safari/VoiceOver or Chrome/TalkBack combination selected from actual users' devices. These are test candidates, not claims that those environments are available or tested. Add other supported combinations as required; do not infer cross-browser success from one browser.

For each required row, record exact OS, browser, assistive-technology version/settings, input method, viewport/zoom, candidate/build, fixture set, observed result, and evidence. Mark unavailable or unexecuted rows **NOT RUN / UNVERIFIED**. An automation scan, expert walkthrough, or browser accessibility tree cannot stand in for observed assistive-technology interaction. The required matrix must be agreed; an unresolved or untested mandatory row keeps product delivery **BLOCKED**.

## Evidence and pre-delivery gate

Assign stable IDs to each affected screen, state, and test scenario. Browser scenarios below use UX-B01 through UX-B08; accessibility uses A11Y-01 through A11Y-10 and UX-R01. Each evidence record includes the criterion/scenario ID, screen/route/state, exact candidate/review key, design/contract version, test environment, synthetic fixture, procedure, expected and observed result, screenshot/log reference, finding, owner, and retest result.

Tester must return **PASS for the exact candidate before delivery of implemented product-facing changes**. This requires all mandatory applicable criteria and required scenarios to be verified. Unmet or unverified mandatory criteria are **BLOCKED**, regardless of a subjective “critical” severity label. N/A needs a reason and review; a valid standards exception needs its evidence. Never report NOT RUN as PASS.

Any candidate/review-key change invalidates both independent approvals and the applicability of prior Tester evidence. Both reviewers reassess the new snapshot; Tester issues a new candidate-bound verdict using justified retained evidence plus affected retests. Post-publication smoke testing is additional verification and cannot replace pre-delivery Tester PASS. This documentation-only package makes no product Tester PASS claim.

## Required browser scenarios

Tester must execute and record evidence for:

1. **UX-B01:** Expired/no-permission session, interrupted login, logout/revoke, and protected-cache cleanup
2. **UX-B02:** Rapid filter changes with delayed responses, refresh, school/branch mismatch, and Back/Forward
3. **UX-B03:** Loading, empty, unknown, stale, partial, API error, and sample-data states
4. **UX-B04:** Invoice preview, incomplete source, unconfirmed policy, double click, stale preview, lost close response, and existing closed invoice
5. **UX-B05:** Partial receipt, available credit, invalid allocation, stale balance, uncertain save, duplicate-reference warning, reversal after later allocation, allocation/balance changes between reversal preview and submit, expired preview, required reconfirmation, and exact committed reversal replay
6. **UX-B06:** Paid invoice disappearing from overdue, reversal reopening it, and acknowledgment without payment
7. **UX-B07:** Live disconnect/reconnect, replay deduplication, expired cursor reset, and expired auth
8. **UX-B08:** Keyboard-only use, mobile/narrow layouts, modal dismissal, and long/large data

Capture evidence from actual rendered screens using synthetic data. Static mockups do not prove integrated behavior, and functional correctness alone does not establish visual quality.


## Participant usability validation plan

**Status: NOT RUN.** No participant findings or successful task results are claimed. Arrange a session only with an authorized representative founder or intended internal-team participant and appropriate consent. Use a permitted test identity and synthetic fixtures; do not grant production access or contact participants merely because this plan exists. An agent/expert walkthrough is useful preparation but is not participant validation.

Test the exact candidate with three realistic tasks:

| Task ID | Participant task | Measurable acceptance |
| --- | --- | --- |
| UX-U01 | Inspect an analytics view and explain its date period, selected school/surface, and data freshness; identify an intentionally partial source | Correctly states the period/scope and identifies the freshness limitation without facilitator help; never treats missing data as zero |
| UX-U02 | Inspect a synthetic invoice/receipt/credit state and explain billed, collected, outstanding, and available credit | Correctly distinguishes all four amounts and explains that receipt entry records cash already received; no currency/domain confusion |
| UX-U03 | Recover from an intentionally unknown receipt-submission outcome | Reconciles or safely retries the original intent, reaches one committed receipt, and identifies the resulting balances without creating another receipt or needing facilitator instruction |

For each task record completion success, unaided/assisted status, help prompts, errors and their consequences, time-on-task as an observation, the participant's comprehension in de-identified notes, candidate/build, fixture, and findings. The initial acceptance target is all three tasks completed unaided with correct interpretation and zero unsafe duplicate/financial action. This is a project test target, not an observed success rate or population-wide usability claim.

Any failed criterion produces a specific finding, assigned fix, and retest of affected tasks on the new exact candidate. Include the tested participant coverage and its limits in the result. If participant validation cannot be run, report **NOT RUN** and keep the corresponding launch-usability gate **BLOCKED**; do not replace it with an invented persona, agent prediction, or an unqualified “easy to use” claim.
