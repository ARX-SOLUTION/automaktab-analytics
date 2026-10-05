# DS00 — Design System Overview

Version: `automaktab-dark-1.0-draft`. Status: written design specification approved 5 October 2026; tokens and runtime assets are not implemented/verified. Authority: latest user dark deep-gray/slate + tech-blue direction, 5 October 2026; supersedes the earlier light direction, while retaining domain and accessibility requirements.

## Document map

| File | Owns |
| --- | --- |
| [DS01](DS01-color.md) | Primitive 100–900 palettes, semantic roles and contrast pairs |
| [DS02](DS02-typography-writing.md) | Type hierarchy, formatting and product writing |
| [DS03](DS03-spacing-radius-shadows.md) | Spacing, layout, radii, borders, elevation and motion |
| [DS04](DS04-component-anatomy-behavior.md) | Anatomy, interactions, focus, data/financial state contracts |
| [DS05](DS05-controls-states.md) | Buttons, TextFields, Badges and Navigation state inventory |

Read with [product/architecture spec](../specs/2026-10-05-analytics-design.md) and [mandatory UX criteria](../ui-ux-requirements.md). DS describes a developer handoff, not a pixel clone of DataFast. No app screenshot or visual PASS exists.

## Purpose and visual thesis

Operate-mode internal dashboard: users inspect reliable scope/freshness, drill into school structure, and deliberately review bookkeeping consequences. A quiet slate canvas, slightly lighter working surfaces, restrained tech-blue actions and readable DM Sans hierarchy support this work. Dense information is acceptable; ambiguous status and financial shortcuts are not.

Original composition: 240-pixel navigation rail on wide screens, contextual page header/filter band, primary working area and inline source-status context. Overview emphasizes a few actionable metrics; school pages prioritize school/branch/subject relationships; review pages prioritize consequences and blockers. At narrow widths use a named navigation drawer, stacked filters and readable tables/cards, not scaled-down desktop typography. These layout dimensions belong to the approved written specification; rendered implementation evidence remains pending.

## System invariants

- Semantic tokens are the component API. Feature code uses `surface.panel`, `text.secondary`, `action.primary`, `state.danger`, not arbitrary palette hex values.
- One token/asset manifest version governs all screens. UX specifies; FE-01 is the sole implementation writer; changes require explicit version/handoff and affected review evidence.
- Dark is the only specified theme in this revision. System preference must not silently activate an unspecified light theme. Honor user font/contrast/forced-colors settings and reduced motion.
- Semantic text/icon labels accompany colors. Red indicates an actual error or meaningfully overdue condition, not every unpaid balance. Blue indicates actions/selection, not trusted completeness.
- Sample data is persistently labeled. Unknown/partial/stale data never becomes zero or fresh because the screen refreshed.
- Native semantic controls, visible focus, readable financial units and progressive detail outrank decoration. No glass effects, gradients, neon glow or ornamental dashboard chrome.

## Proposed implementation manifest

After approval, FE-01 creates one versioned `apps/web/src/design/manifest.json` and `tokens.css`; these files do not exist now. Manifest fields: design version, approval reference, DS source hashes, primitive/semantic mappings, typography/assets with origin/license/hash, responsive/density/motion rules and component version. DM Sans uses self-hosted licensed files and a system fallback; icons require source/license review. Do not download fonts/assets until execution scope allows it.

The package's earlier UX-02 paths are remapped to these DS docs and one manifest; do not introduce a second design-system document/token authority. Feature route registry changes stay FE-02-owned; shared read formats FE-03; financial adapters FE-16. Shared primitive ownership precedes feature parallelism.

## Acceptance and evidence

Map each implemented component/screen/state to UX-B01–08, A11Y-01–10 and UX-R01 as applicable. Test 200% text resize, 320-pixel reflow and 360/768/1280/1440 widths; keyboard, focus, AT, long labels and large synthetic balances. Contrast calculations in DS01 are specification evidence only; verify actual computed colors, overlays and states in the real render.

Every evidence record names candidate/build, contract/design versions, screen/state/criterion, synthetic fixture, OS/browser/AT/input/viewport/zoom/motion, expected/observed result and capture digest. No mandatory untested state is PASS. Exact-candidate Tester PASS and both current independent implementation reviews are required before product delivery. Participant tasks remain a separate launch gate.

## Open decisions

Exact product locale and supported browser/AT matrix require confirmation. Financial policies and principal grants remain the owning business/security decisions, not design defaults. Approval of this DS authorizes subsequent planning, not automatic installation or code execution.
