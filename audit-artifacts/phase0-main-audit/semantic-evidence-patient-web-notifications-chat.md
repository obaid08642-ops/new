# Semantic evidence — Patient Web notifications and chat

Baseline: `22526bedb77a3d8148219036367e4714f401aecc`.

## Notifications

`app/[locale]/notifications/page.tsx` requires patient access, reads server notifications, handles auth/not-found/unavailable/retry, and renders title/body/read state/priority/created time. It links to notification settings. There is no mark-read, delete, preference update or deep-link action in this page.

## Notification settings

`app/[locale]/notifications/settings/page.tsx` requires patient access and reads server settings. It renders general, appointment, order, offer, medication, doctor-message, emergency, sound and vibration categories. The emergency category is explicitly locked/required in the UI; all other values are display-only booleans or not-available. No update form or mutation exists in this source, so settings are read-only in baseline.

## Chat thread

`app/[locale]/chat/[threadId]/page.tsx` validates a UUID-shaped thread id, requires patient access, reads thread and messages in parallel, treats 401 as login and 403/404 as not-found, parses summaries and renders message type/time plus an attachment-hidden label. It explicitly hides message bodies and attachment content. There is no send composer, attachment upload, mark-read, delete or realtime subscription in this source. The corresponding chat list and Backend/socket contract require separate traceability; PHI masking is a positive observation but must be checked against logs, API payloads and provider/admin surfaces.

No Phase 0 remediation was made.
