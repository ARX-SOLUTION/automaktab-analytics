# DS01 — Color Primitives and Semantic Roles

Version: `automaktab-dark-1.0-draft`; status: proposed specification. Owner: UX; implementation owner: FE-01. [DS00](DS00-overview.md) governs use. Palettes are original token selections, not proprietary DataFast assets or source.

## Primitive palettes

100 is the lightest step, 900 the darkest. A scale is a source set, not permission to use every step as text/background. Components consume the semantic mappings below.

| Step | Slate | Tech blue | Success emerald | Warning amber | Danger red |
| --- | --- | --- | --- | --- | --- |
| 100 | `#F1F5F9` | `#DBEAFE` | `#D1FAE5` | `#FEF3C7` | `#FEE2E2` |
| 200 | `#E2E8F0` | `#BFDBFE` | `#A7F3D0` | `#FDE68A` | `#FECACA` |
| 300 | `#CBD5E1` | `#93C5FD` | `#6EE7B7` | `#FCD34D` | `#FCA5A5` |
| 400 | `#94A3B8` | `#60A5FA` | `#34D399` | `#FBBF24` | `#F87171` |
| 500 | `#64748B` | `#3B82F6` | `#10B981` | `#F59E0B` | `#EF4444` |
| 600 | `#475569` | `#2563EB` | `#059669` | `#D97706` | `#DC2626` |
| 700 | `#334155` | `#1D4ED8` | `#047857` | `#B45309` | `#B91C1C` |
| 800 | `#151E2D` | `#1E40AF` | `#065F46` | `#92400E` | `#991B1B` |
| 900 | `#0B111B` | `#172554` | `#064E3B` | `#78350F` | `#7F1D1D` |

Supporting primitives: white `#FFFFFF`; elevated slate `#1E293B`; transparent. The extra elevated color is named `slate.elevated`, not an unversioned feature override. Chart secondary series may use warning/success palettes, but their series label is distinct from product status meaning.

## Semantic mappings

| Role | Value | Usage |
| --- | --- | --- |
| `surface.canvas` / `surface.rail` | slate.900 | Page and navigation ground |
| `surface.panel` / `surface.input` | slate.800 | Cards, table and input surfaces |
| `surface.raised` / `surface.hover` | slate.elevated | Dialog/hover layer; no transparency required |
| `text.primary` | slate.200 | Headings, values and body |
| `text.secondary` / `text.placeholder` | slate.400 | Helper/metadata/placeholder; keep readable |
| `text.disabled` | slate.300 | Readable inactive-control label on slate.700 |
| `text.inverse` | white | Filled action label only on approved backgrounds |
| `border.decorative` | slate.700 | Dividers that are not needed to identify a control |
| `border.control` | slate.500 | Input/button boundary required for identification |
| `focus.ring` | blue.300 | 2px ring with 2px canvas/panel offset; never clipped |
| `action.primary` / hover / pressed | blue.600 / .700 / .800 | White-label filled primary button |
| `action.link` | blue.300 | Underlined inline links; current nav indicator |
| `selection.background` | blue.900 | Selected navigation/filter with blue.200 label |
| `state.success.text` | emerald.300 | Confirmed success paired with label/icon |
| `state.warning.text` | amber.300 | Partial/stale/source limitation paired with explanation |
| `state.danger.text` / control | red.300 / red.700 | Actual error/overdue label; white-label destructive action |
| `state.info.text` | blue.300 | Informational status; never a completeness guarantee |
| `action.disabled.background` | slate.700 | Explicit disabled semantics; no opacity applied to entire control |

Danger badges use panel/raised background and red.300 text plus an icon/label; do not assume red text alone communicates overdue. Do not tint arbitrary transparent fills beneath text without measuring the resulting composite color. Required error input boundaries use red.300, not a low-contrast dark-red border.

## Calculated specification pairs

WCAG sRGB relative-luminance calculation, 5 October 2026; approximate ratios shown for handoff, acceptance uses the unrounded computed ratio. These opaque pairs were calculated; they do not certify rendered screens.

| Foreground / background | Ratio | Intended target |
| --- | --- | --- |
| slate.200 / canvas | 15.343:1 | Ordinary text ≥4.5:1 |
| slate.400 / panel | 6.524:1 | Helper/placeholder ≥4.5:1 |
| slate.400 / raised | 5.705:1 | Metadata ≥4.5:1 |
| slate.500 / panel | 3.515:1 | Necessary control boundary ≥3:1 |
| blue.300 / panel | 9.276:1 | Link/focus contrast |
| white / blue.600 | 5.169:1 | Default action text ≥4.5:1 |
| white / blue.700 | 6.702:1 | Hover action text ≥4.5:1 |
| white / blue.800 | 8.722:1 | Pressed action text ≥4.5:1 |
| white / red.700 | 6.470:1 | Destructive action text ≥4.5:1 |
| amber.300 / raised | 10.145:1 | Warning label ≥4.5:1 |
| red.300 / raised | 7.708:1 | Error/overdue label ≥4.5:1 |
| emerald.300 / raised | 9.597:1 | Success label ≥4.5:1 |

Disabled controls retain readable copy as a project choice, even where WCAG inactive-control exceptions apply. Do not label a preferred standard as an AA requirement. The decorative border is intentionally not a valid required-control boundary. Forced-colors mode uses system colors and retained native outlines.

## Verification

Apply A11Y-01/02 to actual default/hover/focus/pressed/selected/error/loading/disabled states, chart graphics, tooltips and overlays. Normal text ≥4.5:1; qualifying large text ≥3:1; necessary control/graphic information ≥3:1 with documented permitted exceptions. Chart series use labels, markers or patterns and synchronized table/text alternatives. Test at least three simultaneous series; unknown data creates a labeled gap, not a line to zero.

References: [W3C text contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html), [non-text contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html), [repository criteria](../ui-ux-requirements.md). Any palette/semantic change creates a new manifest version and affected verification.
