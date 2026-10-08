# DS02 — Typography and Product Writing

Version: `automaktab-dark-1.0-draft`. Proposed developer specification; [DS00](DS00-overview.md) defines authority and approval. Retain DM Sans with `system-ui, sans-serif` fallback. Font origin: [Google Fonts specimen](https://fonts.google.com/specimen/DM+Sans); before shipping self-hosted files, record exact release/file, license, subset and content hash. No font has been downloaded or installed by this document.

## Type roles

Use rem units against the user's default root font size; pixels below are 16px-root equivalents, not a fixed root override. Use a fixed role scale rather than viewport-fluid headings. A narrow layout changes structure, not readability.

| Role | Size / line-height | Weight | Use |
| --- | --- | --- | --- |
| `type.pageTitle` | 1.75rem / 2.25rem | 600 | One page heading |
| `type.sectionTitle` | 1.25rem / 1.75rem | 600 | Section hierarchy |
| `type.metric` | 2rem / 2.5rem | 600 | Principal value with visible unit |
| `type.body` | 1rem / 1.5rem | 400 | Explanations and financial review |
| `type.control` | .875rem / 1.25rem | 500 | Buttons, nav, field labels |
| `type.table` | .875rem / 1.25rem | 400 | Dense but readable rows |
| `type.meta` | .8125rem / 1.25rem | 400 | Noncritical metadata |
| `type.code` | .875rem / 1.375rem | 400 | Opaque IDs, safe request IDs only |

Heading/body prose measures stay near 65–75 characters where practical. Monetary review and errors use body/control roles, not tiny metadata. Essential units, status or blockers must not be visually demoted or clipped. Use tabular numbers for dates, money and aligned metrics; right-align numeric table columns, left-align labels. Monospace fallback for safe opaque IDs only, not all data.

## Formatting

Format with an explicit approved locale and display timezone; contracts retain their business timezone. Product UI language is unresolved; proposed first locale is Uzbek Latin, with externalized copy. This document uses English example copy, not approved final translations. Avoid concatenating translated sentence fragments; define plural/date/number messages as complete units.

Read money from decimal minor strings and server-confirmed currency scale. No lossy Number conversion or guessed scale. Keep currency visible in cells, totals and review summaries. Do not sum currencies. Show counts, percentages and durations with their explicit units and metric definitions; compare only compatible periods. Unknown is “Unavailable” with a reason, not `0` or `0%`. Long values wrap or expose a labeled table/detail view; truncation never hides reviewed financial consequences.

## Writing rules and example copy

Use short action verbs and consistent domain terms: platform invoice, receipt, allocation, available credit, outstanding, source coverage. Explain what the user can do and what has been confirmed. Do not call recording a receipt “Pay now,” a reversal “Refund,” or acknowledgment “Paid.” Student tuition remains a separate domain.

| Situation | Example copy / behavior |
| --- | --- |
| Sample | “Sample data” persists in the header and relevant exports |
| Unknown count | “Student count unavailable — source coverage is incomplete.” |
| Stale data | “Data through [time]. Refreshing this screen does not update the source.” |
| Partial | “Some source records are missing. This total covers [scope].” |
| Blocked close | “Cannot close this period: [safe source/policy blocker].” |
| Receipt entry | “Record money already received. This action does not transfer money.” |
| Unknown save outcome | “Receipt outcome unknown. Reconcile the original submission before recording another.” |
| Changed review | “Inputs changed. Review the updated consequences before confirming.” |
| Reversal | “Reverse receipt record. No cash refund is performed.” |
| Overdue | “Overdue: [n] days” plus due date, currency and outstanding amount |
| No permission | “You do not have access to this view.” No school name or protected details |
| Error | Safe explanation + recovery; request ID where useful, no SQL/stack/secret |

Button labels are specific: “Review invoice,” “Close reviewed period,” “Record receipt,” “Confirm reversal.” A status message states server-confirmed success only. Avoid generic “Something went wrong” when a safe actionable reason exists, and avoid declaring failure when commit outcome is unknown.

## Validation and evidence

Every input has a persistent label; placeholder is an example, never the label. Required status is text/semantic, not an unexplained asterisk. Associate errors/helpers with the field; preserve valid input after rejection. Announce dynamic status politely and once; do not announce every live row update. Render meaningful heading order and names/roles/states in the agreed browser/AT matrix.

Verify 200% text resizing, user text-spacing overrides, long translated labels, large synthetic amounts, wrapping, no lost controls, and 320px reflow. Test actual DM Sans loading/fallback layout before claiming stability. Use A11Y-04/05/08/10 and UX-R01; a token table is not rendered accessibility evidence.
