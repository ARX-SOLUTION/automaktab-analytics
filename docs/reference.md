# Analytics Reference Study

Status: source-backed design input, 5 October 2026; no DataFast parity or replicated algorithm claim. Read with [current spec](specs/2026-10-05-analytics-design.md) and [DS00](design/DS00-overview.md). The latest user brief, rather than a reference product's palette or pricing, governs Automaktab.

## Evidence labels and limits

**Documented:** the public sources below describe capabilities. **Observed by the parent research task:** official homepage screenshot showed light data cards, KPI row, date/site controls, blue traffic line/revenue bars, source ranking and a map. **Not observed:** live demo interactions and loading/empty/error/accessibility states; `/demo` was client-rendered/unreadable to text retrieval and the cloud browser failed before navigation. This local task did not inspect a rendered demo. Design states in DS04/05 are original requirements, not copied observations.

The user chose dark slate/tech-blue; light screenshot colors are not retained. No proprietary code, screenshot asset, branding, financial record or customer example is imported. Similar category capabilities do not establish identical counting, attribution or identity algorithms.

## Capability-to-product mapping

| Reference evidence | Automaktab interpretation / boundary |
| --- | --- |
| [Overview metrics](https://datafa.st/docs/api/website/analytics/overview) | Versioned units/definitions and oldest-source quality in our overview; missing data remains unknown |
| [Time-series timezone/granularity](https://datafa.st/docs/api/website/analytics/timeseries) | Explicit display timezone and bounded intervals; contract business timezone is separate |
| [UTM tracking](https://datafa.st/docs/utm-tracking) | Allowlisted acquisition dimensions with route/query privacy; own attribution model/window must be specified |
| [Filters/segments](https://datafa.st/docs/datafast-filters) | School/branch/surface/environment/date filters; saved segment authoring remains an explicit later contract |
| [Custom goals](https://datafa.st/docs/custom-goals), [goal interface](https://datafa.st/changelog/goal-analytics-redesign) | Approved event goals and versioned definitions; browser goal cannot establish learning/payment truth |
| [Conversion funnels](https://datafa.st/docs/conversion-funnels) | Ordered page/event steps with defined windows/repeats and verified conversion links |
| [Journey context](https://datafa.st/changelog/goal-tracking) | Bounded privacy-filtered event journeys; no session replay or raw DOM capture implied |
| [Identity](https://datafa.st/docs/user-identification) | Distinct visitor/session/auth actor/school/transaction, authoritative proof, logout/shared-device handling |
| [Cross-domain tracking](https://datafa.st/docs/cross-domain-tracking) | Our three related surfaces require approved cookie/link/session scope; do not automatically add link decoration or expose identifiers |
| [Previous-period comparison](https://datafa.st/changelog/previous-period-comparison) | Compatible explicit date comparisons, quality and unit context; no comparing incomplete intervals as equal coverage |
| [Custom ranges](https://datafa.st/changelog/custom-date-range), [pinned periods](https://datafa.st/changelog/pin-favorite-dashboard-periods) | Safe URL ranges and proposed preferences; no new business-timezone default |
| [Revenue analytics distinctions](https://datafa.st/docs/cli-analytics) | Separate platform billed/cash/outstanding/credit/recurring metrics and attributed acquisition value; no student tuition included |
| [Privacy guidance](https://datafa.st/docs/gdpr-cookieless-tracking) | Identifier rotation may limit long-term attribution; self-hosting does not remove consent/privacy decisions |
| [X mentions](https://datafa.st/docs/twitter-mentions), [link attribution](https://datafa.st/docs/twitter-link-attribution), [Meta attribution](https://datafa.st/docs/meta-ads-attribution) | Reference capabilities only; no external connector, credentials, ROAS model or entitlement is approved here |

“New/returning” is not verified cohort-retention analysis. Public pricing FAQ differences do not establish fixed premium entitlements. Do not use either as a product requirement or claim about our implementation.

## Full roadmap and phased delivery

Keep the agreed advanced roadmap: overview, acquisition/traffic/pages, versioned goals/funnels and journey context, usage, official learning with practice segmentation, bounded live activity, school/branch/subject structure, school-specific contracts and billing breakdowns, reviewed invoice/receipt/reversal/correction workflows, overdue in-app reminders and diagnostics/audit. Their definition, privacy, source and financial gates stay explicit. No reference research recommendation removes these requirements.

Recommended first delivery is the synthetic school/source-status slice previously proposed in reviewed planning inputs, followed by analytics and financial vertical slices in M0–M8 order. Current candidate and execution approval remain pending. This phasing is a proposal pending written-spec/plan approval, not a reduced product commitment. General cohort/multitouch/prediction builders, replay, decorative globe, social/ads integrations and public dashboards are optional future decisions where not already part of an approved contract; this document neither approves nor silently rejects them.

Start on PostgreSQL/Drizzle with indexed projections and measured query/ingestion workloads. Introduce another analytical store only after measured volume/latency/cost evidence justifies it. Keep raw events, verified links, attribution versions, rollups and immutable ledger separate; dedup/rebuild/replay cannot double money or conversions. Marketing school ownership may be null; client tenant IDs never authorize school access. Event-time membership and proof revisions matter for historical analysis.

## Research handoff

The detailed source findings were supplied by the parent primary-source research task; the local task independently confirmed `/demo` has no readable text body. Record actual rendered reference inspection if later available; do not substitute source documentation for observed interactions. Capture original Automaktab states and synthetic records during implementation, with the criterion/evidence format in the repository. This document establishes inspiration and distinctions only.
