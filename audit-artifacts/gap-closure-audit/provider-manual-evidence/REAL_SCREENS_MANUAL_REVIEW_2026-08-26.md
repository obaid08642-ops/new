# Provider RealScreens: manual semantic review

## scope

تمت قراءة `src/screens/shared/RealScreens.tsx` كاملًا، 1–410، من baseline `main @ 22526bedb77a3d8148219036367e4714f401aecc`.

| ID | evidence | finding | required closure |
|---|---|---|---|
| P-REAL-001 | lines 41–46 | reviews aggregate is hardcoded as `4.9` based on `142 reviews`, though list itself is fetched | replace aggregate with server data or remove it; prove review eligibility, moderation, provider ownership and safe reply policy |
| P-REAL-002 | line 55 | rating rendering uses `''.repeat(rev.rating)`, which always renders nothing | correct the visual renderer using approved accessible vector/rating UI and validated numeric bounds |
| P-REAL-003 | 231–264 | 2FA switch is initialized locally and only calls `setTwoFactor`; it performs no read/write/enrollment/verification | false security control; remove until actual 2FA enrollment, challenge, recovery and server-side enforcement are implemented |
| P-REAL-004 | 277–285 | Active Devices card displays a fixed `iPhone 15 Pro Max` / Riyadh session with no device query, revoke, or session management | false device-security information; replace with server session list and revoke-all/single-session flow or hide |
| P-REAL-005 | 311–326 and 331–350 | notifications fetch errors become empty list; there is no mark-read/deep-link/notification preference action | distinguish error from zero notifications and build secure read/action lifecycle before using notifications as journey evidence |
| P-REAL-006 | 399–405 | direct support hotline `920000000` and domain `support@nabdah.sa` are literal values that require ownership verification; no ticket history/status is shown | classify via operations owner: replace with real controlled support channels or remove. Add ticket lifecycle/history/attachments policy if supported |

## contract and product requirements

Working-hours UI is a credible early anchor (GET/PUT with validation and error state), but it is not complete booking availability. Backend/data reconciliation must prove timezone, date exceptions, holidays, breaks, overlapping intervals, provider/facility scope, slot generation/locking and booking race behavior. Support, reviews and password endpoints likewise remain anchors rather than verified backend contracts.
