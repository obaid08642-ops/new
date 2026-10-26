# Owner ink override (2026-10-26)

Owner: "everything is black; we agreed on more colours, not only red and black." Body text and titles stay ink. Everything else that was ink is a token colour. This overrides the boards where they draw ink on interactive or accent elements; the boards stay as history. No new colours: only `@nabd/design-tokens`.

| Role | Rule |
|---|---|
| Selected chip, segmented option, day chip, category chip | soft tint `color.service.coral.bg` with `color.service.coral.fg` (or the page's service tone). Never solid ink. |
| Active tab-bar / nav pill | `color.action.primary.bg` with `color.action.primary.fg` (same coral in dark) |
| Header "Sign in" | primary action button |
| Outline button | border and label `color.action.primary.bg` |
| Header icons (bell, cart, language, back, actions) | `color.text.secondary`; map icon amber (`color.service.map`) in a soft tile |
| Section / row icons | their service tone (no `ink` tone) |
| Solid-ink secondary buttons | removed: primary coral |

Patient-app: `packages/ui-native` (Chip, Segmented, TabBar via `shellTokens`, Button outline, IconButton neutral, AppHeader chevron) and the screens that hard-wired `action.selected`. Selected text on tint uses the repo pair coral fg on coral bg (4.5:1, `contrast-check` passes 171/171).
