# Colour audit (owner complaint 2026-10-25: "screens are all black, only red and black")

Per-area tables (screen | board colour | live colour | fixed | file:line):

- Web, slice 1 (home, hubs, headers, nav, chips, buttons): `COLOUR_AUDIT_web-slice1.md`
- App, slice 1 (same list): `COLOUR_AUDIT_app.md`

Result of slice 1: the shared components already apply the ten service tones; the regressions found were small (3 on web, 2 in the app). The remaining "ink" uses
(order/return/call status chips, security chip, profile/settings glyphs) are listed under "Needs review" in the web table, for the next slice
(signed-in account, settings, orders, returns). Web was checked at runtime against a stand-in API (empty data); signed-in screens were not seen.

## Slice 2 (static): remaining "ink" uses

Checked against the boards (`Orders.dc.html`, `Ord20-MyMedicalOrders.dc.html`): no board shows a cancelled/draft/rejected/missed status in a service tone, so the neutral `ink`
chip for the end states `cancelled`/`draft` (orders/status-tone.ts:21), rejected/missed calls (consultations/call-history/page.tsx:22) and return statuses
(returns/return-kit.tsx:18) is NOT a lost service tone: a failed or inactive state is deliberately neutral. Left unchanged; owner to say if they want these in a tone.
The ink glyphs in profile/settings/about rows are on the Account board (gear ink, other rows toned), per the app agent's check.
Not runtime-verified: signed-in screens were not seen (no real backend/login in this session).
