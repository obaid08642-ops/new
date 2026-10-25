# Colour audit (owner complaint 2026-10-25: "screens are all black, only red and black")

Per-area tables (screen | board colour | live colour | fixed | file:line):

- Web, slice 1 (home, hubs, headers, nav, chips, buttons): `COLOUR_AUDIT_web-slice1.md`
- App, slice 1 (same list): `COLOUR_AUDIT_app.md`

Result of slice 1: the shared components already apply the ten service tones; the regressions found were small (3 on web, 2 in the app). The remaining "ink" uses
(order/return/call status chips, security chip, profile/settings glyphs) are listed under "Needs review" in the web table, for the next slice
(signed-in account, settings, orders, returns). Web was checked at runtime against a stand-in API (empty data); signed-in screens were not seen.
