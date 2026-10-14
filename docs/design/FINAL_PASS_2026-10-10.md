# Final pass on main (e768aa5c, 2026-10-10)

Tools: `screen-inventory.mjs` (patient app + web, provider-app), `admin-inventory.mjs`, runtime check done in the batch PRs. Inventories regenerated in this PR.

| App | Screens | Endpoint pairs | OK | NO_ROUTE | WRONG_METHOD | Unresolved sites | Needs-review file:line |
|---|---|---|---|---|---|---|---|
| patient-app | 248 routes | 358 | 356 (2 partial) | 0 | 0 | 4 (generic data sources) | final-pass-2.json |
| patient-web | 254 routes | 460 | 458 (2 partial) | 0 | 0 | 0 | – |
| provider-app | 131 screens | 252 distinct | 252 | 0 | 0 | 1 (`catalogs.ts:117`) | final-pass-2.json |
| admin | 56 pages | 308 call sites | 297 (+8 BFF) | 2 (community moderation, waits D-1) | 0 | 1 (`approvals.tsx:35`) | final-pass-2.json |

Gates (baseline → now, none up): no-literal-ui-string 213 → 213, no-raw-color 1271 → 1271, client-token-sync 694 → 694, no-left-right 114, no-px-font-size 12, no-rn-safeareaview 15, no-emoji-in-ui 43; locale-parity ok (no new problem).

Items 7 and 8 of the owner list are already on main: the single emergency screen (`UrgentHelpView`, app and web, number from `GET /mental-health/urgent-help`; old SOS routes redirect) and no `HospitalDispatchScreen` in provider-app.
