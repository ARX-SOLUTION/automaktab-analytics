# DS03 — Spacing, Geometry and Elevation

Version: `automaktab-dark-1.0-draft`; proposed specification. [DS00](DS00-overview.md), [colors](DS01-color.md) and [type](DS02-typography-writing.md) are authoritative together. Implementation owner: FE-01, with FE-02 owning app layout wiring.

## Spacing scale

Use a 4px-equivalent base with rem units; do not set a fixed root font size.

| Token | rem | 16px-root equivalent | Intent |
| --- | --- | --- | --- |
| `space.1` | .25 | 4px | Icon/text micro-gap |
| `space.2` | .5 | 8px | Related control gap |
| `space.3` | .75 | 12px | Compact cell/control padding |
| `space.4` | 1 | 16px | Card and mobile gutter |
| `space.5` | 1.25 | 20px | Related content group |
| `space.6` | 1.5 | 24px | Card/desktop group padding |
| `space.8` | 2 | 32px | Section separation |
| `space.10` | 2.5 | 40px | Major transition |
| `space.12` | 3 | 48px | Spacious section boundary |

## Layout and density

Proposed wide rail: 15rem (240px equivalent); mobile navigation is a named drawer, not an icon-only permanent rail. Page padding: 1.5rem wide, 1rem narrow. Working content uses available width; narrative/financial explanation has readable max-width. Tables can remain dense, while receipt review totals get clear group separation.

At 1280/1440px show rail and expanded filter group; at 768px allow collapsed navigation and wrapping filter rows; at 360px stack controls and keep active filter count/reset visible. The 320px reflow test remains mandatory. Use content-driven breakpoints where real long-label testing proves necessary; these widths are evidence targets, not permission to clip between them.

Control heights: standard 2.5rem (40px), prominent touch 2.75rem (44px); compact table action 2rem (32px) only with sufficient hit area/spacing. A11Y-03 AA minimum is 24×24 CSS pixels or a documented allowed exception; 44px is a project preference. Controls may grow with text, errors and zoom; never hard-clip their content to the nominal height. Table rows start at 2.75rem and grow for wrapped labels. One layout handles minimum, typical and very large synthetic records.

## Radius, borders and shadows

| Role | Specification |
| --- | --- |
| `radius.control` | .375rem (6px equivalent) |
| `radius.panel` | .5rem (8px) |
| `radius.dialog` | .75rem (12px) |
| `radius.badge` | .25rem (4px); no oversized decorative pills |
| Divider | 1px `border.decorative`, not required identification |
| Control boundary | 1px `border.control`; semantic error boundary uses danger text color |
| Focus | 2px `focus.ring`, 2px opaque surrounding-surface offset |
| Popover shadow | `0 8px 24px rgba(0,0,0,.28)` plus opaque raised surface and border |
| Dialog shadow | `0 16px 48px rgba(0,0,0,.4)` plus opaque raised surface and border |

Elevation is primarily surface contrast and boundary, not black shadow on a dark canvas. Shadows are decorative and cannot be the only cue to a control or modal. The backdrop may dim context but modal text stays on an opaque measured surface. Measure composite colors when translucency is used.

## Layers and motion

Named layers: base 0, sticky page/filter 10, popover 20, modal backdrop 30, modal 40, transient status 50. Use a portal/native popover/dialog where needed to escape overflow containers; numbers alone cannot resolve stacking contexts. Sticky headers, banners and drawers must not obscure keyboard focus. Toasts must not hide financial review actions or be the only persistent result evidence.

State transitions: 150ms default, 200ms drawer/dialog maximum target; no orchestrated page-load choreography. Reduced motion removes nonessential animation while preserving status, focus and timing. Live pulse is optional and never the sole indicator. Avoid scrolling/fade transitions that displace financial controls during confirmation.

## Narrow data and validation

Tables retain true row/column relationships. On narrow screens choose a synchronized detail/card representation or clearly bounded table scroll for essential two-dimensional content. Essential-table exceptions do not permit unrelated page text/filter clipping. Show column headers/units and keep totals accessible. Avoid CSS reordering that contradicts reading/focus order.

Verify actual bounds and zoom at UX-R01 widths plus 320px, long labels, multiline helpers, error summaries, banners, modal combinations, touch and keyboard. Inspect focus outline clipping and open overlays. Required IDs: A11Y-03–07/09/10, UX-B08. No current layout measurements or visual captures exist.
