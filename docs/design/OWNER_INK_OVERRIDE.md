# Owner ink override, 2026-10-26

Owner: "everything is black; we agreed on more colours, not only red and black."

Binding. It overrides the boards where they draw ink (the `action.selected` / `brand.ink` colour) on an interactive or accent element. The boards stay as history. Body text and titles stay ink. No new token and no new colour: every value below already exists in `packages/design-tokens/tokens.json`.

| Role | Rule | Tokens |
|---|---|---|
| Selected chip, filter, segmented option, day or category chip | Soft coral tint with coral text. Never solid ink. | `service.coral.bg` / `service.coral.fg` |
| Active nav pill, rail item, bottom tab bar pill, tab | Brand coral with the on-brand label (in dark the same coral token, with its dark label). | `action.primary.bg` / `action.primary.fg` |
| Header "Sign in" | The primary action button: coral gradient, white label. | `action.primary.gradient.*` |
| Outline button | Coral border and coral text. | `action.primary.bg` |
| Header icons (bell, cart, moon, user) | Secondary colour. The map icon is amber in a soft amber tile. | `text.secondary` / `icon.secondary`, `service.amber.bg` / `service.amber.fg` |
| Section-header icons | The icon in its service tone. | `service.<tone>.fg` |
| Solid-ink secondary buttons (add to cart, filter square, filled icon button, chat bubble of the user, offer pick) | Gone: primary coral. | `action.primary.*` |

Contrast: the outline text pairs (`action.primary.bg` on `bg.surface` and `bg.canvas`, 4.5:1) and `icon.secondary` on `bg.canvas` were added to the `contrast` list of `tokens.json`; `service.coral.fg` on `service.coral.bg` and `action.primary.fg` on `action.primary.bg` were already there. `node tools/design/contrast-check.ts` passes in light and dark.

## Where it overrides which board (web)

| Board | Element | Was | Now |
|---|---|---|---|
| HomeWeb | active nav link, Sign in | ink pill | coral pill, coral gradient button |
| HomeWeb / HomeApp | outline button ("Details"), `Button` outline | ink border and text | coral |
| HomeApp | active tab of the bottom bar, sidebar active item | ink pill | coral pill |
| Consult, Search, Settings, Orders, CheckoutV2 | selected Chip, Segmented, quick chips, option chips | ink fill / raised white pill | coral tint |
| Cart, Product, Search | add button, filter square | ink square | coral square |
| Rx, Offers | own chat bubble, "choose offer" | ink | coral |

Not covered by this override: facility accounts, the insurance policy add/edit form, the toast (inverse surface), photo-viewer overlays, carousel dots, focus rings, and the ink-toned service tiles (settings, about, terms), which are a tone of the 10-tone palette and not a selected or interactive state.
