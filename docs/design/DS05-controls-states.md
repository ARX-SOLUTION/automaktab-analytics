# DS05 — Buttons, TextFields, Badges and Navigation

Version: `automaktab-dark-1.0-draft`; proposed developer specification. [DS01](DS01-color.md), [DS02](DS02-typography-writing.md), [DS03](DS03-spacing-radius-shadows.md) and [DS04](DS04-component-anatomy-behavior.md) govern visuals/behavior. FE-01 owns shared primitives; FE-02 owns navigation/session behavior.

## Shared state precedence

Every interactive control defines default, hover, focus-visible, pressed, disabled and pending. Selected, readonly, error, success, warning, permission-denied, offline and outcome-unknown are applied only where meaningful; N/A has a reason. Combined states retain focus and associated explanation: error+focus uses the error boundary plus focus ring; selected+focus retains selection plus ring; pending/UNKNOWN cannot become a new valid financial submission because text changed.

No whole-control opacity shortcut: it can destroy text/outline contrast. Prefer semantic colors, real disabled/readonly behavior and specific explanatory text. Important touch actions prefer 44px height; actual hit areas/spacing meet A11Y-03's 24px minimum or documented exceptions.

## Buttons

Anatomy: optional decorative 16px icon, concise verb label, optional pending indicator, stable padding/width. Primary/secondary/tertiary/danger variants use identical geometry and type. Icon-only button requires a name and at least the standard hit area; tooltip is supplementary. Submit has explicit `type`; links navigate and buttons act.

| State | Visual | Behavior / accessible result |
| --- | --- | --- |
| Default primary | blue.600 fill, white label | Enter/Space activation, one action |
| Hover | blue.700 fill | No layout shift or hidden extra action |
| Pressed | blue.800 fill | Temporary activation feedback, not committed success |
| Focus-visible | Default/hover plus blue.300 ring with opaque offset | Visible/unobscured keyboard focus |
| Secondary default/hover | Panel/raised fill, control border, primary text | Equal readable behavior; no blue fill competition |
| Tertiary | Underlined link color when inline, clear action name | No ambiguous link/button semantics |
| Danger default/hover/pressed | red.700/.800/.900, white label | Reviewed consequence and explicit label; no destructive initial focus |
| Disabled | Slate.700 fill and `text.disabled` label | Native disabled; reason visible in nearby text, not hover-only |
| Pending | Preserve width; named progress and busy state | Suppress duplicate activation; financial intent/key unchanged |
| Committed success | Persistent result context, optional success label | Server-confirmed only; refresh affected reads |
| Error/conflict | Keep retry/review action beside safe persistent reason | Retry same intent only if permitted; conflict requires review |
| Permission denied | Remove unauthorized action or disable with safe reason | Backend independently authorizes; no protected detail leakage |
| Offline/UNKNOWN | “Reconcile submission” with explanatory status | Financial replacement submission blocked until definitive resolution |

Selected/checked state belongs to a toggle button with `aria-pressed`, not every action button. Readonly has no separate button behavior (N/A). Loading is not a disabled explanation of source/policy blockers; keep those causes visibly separate.

## TextFields

Anatomy: persistent label + required/optional wording, input, optional currency/unit suffix, helper, error/status. Prefix/suffix does not replace a label. Use text input with an appropriate input mode for exact monetary strings; never accept an implicit floating-point amount as the authoritative contract. Currency/scale is supplied by server rules.

| State | Visual | Behavior / accessibility |
| --- | --- | --- |
| Empty default | Panel fill, control border; secondary placeholder | Label remains; example placeholder only |
| Filled | Primary text; helper and units retained | Controlled value follows one state source |
| Hover | Same or measured brighter boundary | No meaning available only on hover |
| Focus-visible | Control boundary plus focus ring | Native selection/caret; no autofocus destructive action |
| Editing/pressed | Focused text/caret, no button-style fill | Native typing, composition and paste preserved |
| Invalid | danger text/boundary, specific associated error | `aria-invalid`; helper/error IDs; valid input preserved |
| Warning | warning helper/icon, not an error claim | Explain consequences before submit; no automatic change |
| Valid/committed | Optional explicit status | Client-valid does not mean persisted/paid |
| Disabled | Readable text and disabled style | Not operable; external reason, no submitted value assumption |
| Readonly | Readable panel/value, explicit immutable context | Native readonly; selectable/copyable; no misleading editing affordance |
| Pending | Preserve value; busy context; lock consequential edits if required | No duplicate submit; async validation result tied to current value |
| Permission/session denied | Clear protected contents where required | Safe no-permission presentation; no old actor draft |
| Offline/UNKNOWN | Preserve permitted safe draft/recovery context | Edits cannot bypass UNKNOWN intent guard; no offline financial queue |

Selected state is native text selection, not a faux checked field (N/A as application selection). Monetary review format and editable decimal input mapping are specified separately in C01; invalid precision/scale must be rejected, not silently rounded. Test IME, paste, long labels, autocomplete behavior, errors and clear/reset naming.

## Badges

Anatomy: short status label, optional decorative icon, optional relevant numeric quantity. Status meaning is text; color is supplementary. A default badge is noninteractive text, not a focusable element or repeated live announcement.

| State | Label/semantic treatment |
| --- | --- |
| Neutral/default | Primary/secondary text on panel; e.g. “Draft” |
| Selected scope | Blue label + visible scope; not proof of authority |
| Pending/loading | “Pending” or “Refreshing”; source state named |
| Success | “Confirmed”/“Recorded” only from server result; emerald text |
| Warning/stale/partial | Explicit “Partial”/“Stale” with coverage details elsewhere; amber text |
| Error/overdue | Red text + label/icon; “Overdue: [n] days” with due amount/date context |
| Unknown/offline | Explicit unavailable/disconnected label; no zero or green healthy state |
| Disabled/not-applicable | “Not applicable” only from defined domain applicability, not missing source |
| Permission denied | Safe access label; no protected quantity |

Hover/focus/pressed/readonly are N/A for noninteractive badges. A removable filter chip is a separate interactive component: selection label + named remove button, keyboard/focus/hover/pressed/disabled states as buttons, no nested clickable badge. Provide persistent text for details otherwise hidden in a tooltip.

## Navigation

Anatomy: named navigation landmark, consistent destination label and optional decorative icon, current-location indicator; narrow-screen drawer has title, toggle state, close action and focus restoration. Standard navigation uses links, not ARIA menu semantics. Only actual tabs implement tablist/tabpanel keyboard patterns.

| State | Visual / behavior |
| --- | --- |
| Default | Secondary readable label, true destination URL |
| Hover | Raised background, primary text; no layout shift |
| Focus-visible | Ring/underline visible within scroll viewport |
| Pressed | Temporary raised/selection feedback; do not claim page load complete |
| Current/selected | Blue.900 background, blue.200 label and non-color indicator; `aria-current=page` |
| Loading destination | New page loading state; nav remains usable where safe; no hidden duplicate mutation |
| Disabled/unavailable | Safe explanation; no active link with fake disabled CSS |
| Permission denied | Omit protected destination or show safe access state; server still guards deep links |
| Error/offline | Retain safe route context and retry/back; no stale protected cache exposure |
| Session expired | Close streams/clear protected caches and show sign-in state |
| Interrupted/UNKNOWN financial intent | Navigation does not cancel server action; recovery persists under approved actor-bound contract |

Back/Forward restores normalized URL filters without mutation. School changes clear incompatible branch visibly. Query keys include all normalized filters and definition versions; delayed responses never replace current-scope content. Readonly/success are N/A as link interaction states; a page-level success remains in the page, not a nav badge claiming transaction completion.

## Required evidence

Exercise applicable combined states, native keyboard interactions, dialogs/drawers, forced colors, reduced motion, 200% resize/320px reflow, long translated text and large synthetic financial values. Map to A11Y-01–10/UX-R01 and affected UX-B01–08. Automated component scans supplement real browser/AT and paired workflow evidence; no control implementation or visual PASS is claimed here.
