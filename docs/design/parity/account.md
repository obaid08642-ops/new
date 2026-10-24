# Parity status: account and sign-in

Audited 2026-10-16; verified against main on 2026-10-23. Statuses: fixed earlier / fixed now / open (web can fix, not done in this pass) / blocked [class] / no change.


## parity-account.md (37 rows)

| # | screen | element | status | note |
|---|---|---|---|---|
| 1 | /welcome | sign-in providers | blocked [owner] | needs provider client ids / Apple setup |
| 2 | /welcome | guest start failure | fixed now | stays on Welcome, inline Welcome.guestFailed |
| 3 | /welcome | language pill and theme switch | open (web can fix; not done in this pass) |  |
| 4 | /welcome | first-launch flow | fixed earlier | owner decision 32: next.config redirects /onboarding/* to home |
| 5 | /login | social sign-in | blocked [owner] | needs provider client ids / Apple setup |
| 6 | /login | Google button label | blocked [owner] | needs provider client ids / Apple setup |
| 7 | /login | client validation and lockout | fixed now | empty/short check and 5-fails/5-min lockout kept on the browser |
| 8 | /login | after sign-in target | blocked [owner] | no provider-info page on web |
| 9 | /register | fields | fixed now (partly) | confirm password added; separate email/phone blocked [backend]: contract takes one identifier |
| 10 | /register | validation messages | fixed now | one message per rule |
| 11 | /register | password rule | fixed now | 10 characters (backend rule) in register, reset and change-password; hint updated |
| 12 | /register | step order | blocked [backend] | register-then-OTP is the backend flow |
| 13 | /otp | paste and autofill of the 6-digit code | fixed earlier | cbad6c19 |
| 14 | /otp | resend countdown | blocked [backend] | backend otp/request throttle is 3 per 10 min; 60 s would hit 429 |
| 15 | /otp | "change email / change phone" link | fixed now | back link labelled 'Change email or phone' |
| 16 | /forgot-password | next step | blocked [backend] | web has no OTP-based reset; backend forgot returns a token by mail |
| 17 | /password-reset | success state | fixed now | success screen + sign-in button |
| 18 | /password-reset | show/hide password | fixed now | eye toggle + live mismatch |
| 19 | / (home) and /dashboard | health reminder card | open (web can fix; not done in this pass) |  |
| 20 | /dashboard | "your records" card | open (web can fix; not done in this pass) |  |
| 21 | /dashboard | offers and packages sections | fixed now | CuratedSections from /content/home on the dashboard |
| 22 | /dashboard | points card | fixed now | PointsCard from GET /loyalty/account |
| 23 | /dashboard | unread bell dot | blocked [backend] | no unread-count endpoint in the backend notifications controller |
| 24 | /dashboard | data load failure | blocked [owner] | owner rule 2026-10-06: ErrorState on outage |
| 25 | / (home) | AI card "start" and mode tools | no change | owner decision |
| 26 | /search | recent searches | fixed earlier | recent searches present in search-client |
| 27 | /search | lab and lab-package results | fixed earlier | 09504708 |
| 28 | /search | barcode scan in the search field | blocked [owner] | browser has no barcode scanner flow; /drug-scanner is app-only |
| 29 | /search | per-section "see all" | fixed now | see-all button selects the section's tab |
| 30 | /search | filters, sort, pharmacies tab, product grid | blocked [owner] | needs product filters the search API does not return (no sort/filter params, no price cards) |
| 31 | /notifications | category filter chips | fixed now | system/medical/offers chips (the app's grouping), shown when more than one group |
| 32 | /profile | guest state | fixed now | guest card with sign-in and create-account |
| 33 | /profile | shortcut values and row counts | open (web can fix; not done in this pass) |  |
| 34 | /profile/addresses | map point and default choice | fixed now (default only) | Make default (PATCH is_default); map picker: no map component on the web, see needs-review |
| 35 | /settings/language | calendar preference | blocked [owner] | app keeps a device-only calendar preference; the web formatters do not honour a Hijri choice, a switch would do nothing |
| 36 | /settings | sign out and version | fixed now | sign-out on the hub; version: see needs-review |
| 37 | /settings/security | change password and two-factor | fixed now | ChangePasswordForm + /api/settings/password (keeps session) |

## parity-settings.md (21 rows)

| # | screen | element | status | note |
|---|---|---|---|---|
| 1 | /settings | sign out and version (also in parity-account.md) | fixed now | sign-out on the hub; version: see needs-review |
| 2 | /settings | account summary source | fixed now | hub rows drawn when /auth/me fails |
| 3 | /settings/notifications | notification kinds | blocked [backend] | web edits categories/channels; app uses flat flags |
| 4 | /settings/notifications | request body | blocked [backend] | web edits categories/channels; app uses flat flags |
| 5 | /settings/notifications | sound and vibration, permission prompt | open (web can fix; not done in this pass) |  |
| 6 | /settings/language | calendar preference (also in parity-account.md) | blocked [owner] | app keeps a device-only calendar preference; the web formatters do not honour a Hijri choice, a switch would do nothing |
| 7 | /settings/language | language change | no change | route-based locale accepted in audit |
| 8 | /settings/security | change password (also in parity-account.md) | fixed now | ChangePasswordForm + /api/settings/password (keeps session) |
| 9 | /settings/security | biometric and two-step switches | fixed now | two-factor toggle via /api/settings/security; biometric stays read-only |
| 10 | /settings/security | sessions list | fixed now | label/platform, masked ip, last active, this-device chip, confirm before ending (location not sent by the backend: masked ip only) |
| 11 | /settings/privacy | storage summary | open (web can fix; not done in this pass) |  |
| 12 | /settings/privacy | delete account: first step | fixed now | explanatory confirm step before the password form |
| 13 | /settings/privacy | 403 / 404 on any tab | fixed earlier | e37eeb3c |
| 14 | /settings/help | call support | fixed now | tel: row from GET /config contact.support_phone, hidden without a number |
| 15 | /settings/help | FAQ categories | open (web can fix; not done in this pass) |  |
| 16 | /settings/help | support requests | open (web can fix; not done in this pass) |  |
| 17 | /settings/help | feedback form | open (web can fix; not done in this pass) |  |
| 18 | /support/ticket | request row | fixed now | rows and empty state open /support/chat |
| 19 | /settings/about | version | blocked [owner] | web has no build version to show |
| 20 | /settings/about | published policy documents | open (web can fix; not done in this pass) | needs fields/endpoints check or more work |
| 21 | /settings/about | cancellation and returns | no change | same content, layout only |
