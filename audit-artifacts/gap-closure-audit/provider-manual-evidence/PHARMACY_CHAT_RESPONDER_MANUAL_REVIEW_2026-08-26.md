# Provider PharmacyChatResponder: manual semantic review

## reviewed source

`src/screens/shared/PharmacyChatResponder.tsx`, lines 1–103, baseline `main @ 22526bedb77a3d8148219036367e4714f401aecc`.

| ID | evidence | confirmed defect | required closure |
|---|---|---|---|
| P-CHAT-001 | lines 17–20 | Socket.IO is created without auth credentials, session handshake, role/tenant scope, room join or thread authorization. In addition, `API_BASE` is referenced but not imported in this file. | remove/rebuild with authenticated server handshake, explicit authorized room join and typed thread membership; resolve runtime reference safely through one configuration module |
| P-CHAT-002 | lines 27–29 | subscribes to global `pharmacy:message` and appends every incoming event without checking thread, sender, tenant or schema | possible cross-thread/tenant PHI exposure; require server room isolation and client thread/event validation |
| P-CHAT-003 | lines 36–44 | `send` creates local message with `Date.now`, appends it before delivery, emits arbitrary client object and has no ack/retry/failed state | false-send and integrity problem; send through an authorized endpoint/event with server IDs, acknowledgment, deduplication and delivery failure UI |
| P-CHAT-004 | lines 46–50 and 65/72–74 | `sendInvoice` creates a local invoice message and displays invoice-sent success without payment intent, immutable invoice, consent or ledger | false financial action; remove until a quote/invoice/payment lifecycle is server-backed and authorized |
| P-CHAT-005 | lines 9 and 54–57 | patient name and thread ID arrive from navigation params without local validation; UI displays the supplied patient identity | require server-resolved thread participant identity; never trust display PHI from deep-link/route parameters |
| P-CHAT-006 | lines 23–25 | fetch history has no loading, typed error, 401/403/404 behavior or empty/error distinction | add privacy-safe negative states and user-visible recoverability |

This component must not be used as evidence that Pharmacy chat is secure. It is a separate, materially weaker path than the API-backed `PharmacyChatScreen` inside `PharmacyDashboard`; the final architecture must remove duplicate inconsistent chat implementations.
