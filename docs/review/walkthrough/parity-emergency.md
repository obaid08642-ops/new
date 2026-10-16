# Parity: emergency (web vs app; no board)

Screens compared: /emergency (urgent help: tel: button from admin config, share my location), /emergency/sos, /emergency/sos-active, /emergency/tracking (redirects). No board exists for /emergency (inventory: "none: emergency").
Gaps: missing 0, different 0, wrong 1, illogical 1, broken 0 (2 rows).
Method: static reading of patient-web/app/[locale]/emergency/page.tsx, components-next/emergency/share-location.tsx, patient-app/src/components/emergency/UrgentHelpView.tsx; no render was run.

| screen | element or section | in the app or board | on the web | expected | web file:line | class |
|---|---|---|---|---|---|---|
| /emergency | access for a signed-out visitor | screen has no sign-in gate; GET /mental-health/urgent-help is public | requirePatientAccess redirects to /login, so the urgent number is unreachable until sign-in | page readable without sign-in (only the share action needs an account) | patient-web/app/[locale]/emergency/page.tsx:27 | illogical |
| /emergency | backend failure while loading the number | in-page error with retry (Gate), share button still shown | callPatientApi is not in try/catch; a network error throws to the error boundary instead of the in-page state (only a non-2xx is handled) | catch the throw and show the same in-page error | patient-web/app/[locale]/emergency/page.tsx:31 | wrong |

No gap: /emergency/sos, /emergency/sos-active, /emergency/tracking (all redirect to /emergency as the app does); share-my-location flow (permission, sent, no contacts, SMS links) and the tel: number from config match the app.
