# Moyasar go-live readiness (session F, 2026-10-31)

Read on `main` after the money-audit PR. **Verified** = I read the code or ran its tests. **Needs the owner's keys** = cannot be checked without them. No key, no live call was used.

## Checks

| Area | Status | Evidence |
| --- | --- | --- |
| Webhook authentication | Verified | `common/moyasar-webhook-auth.ts`: body `secret_token` equal to `MOYASAR_WEBHOOK_SECRET` (constant time), or an HMAC-SHA256 of the raw body in a signature header. No secret set → every webhook is refused. Journey `tools/live/j_payment_webhook.py` (wrong secret, no secret, right secret, redelivery, unknown id). |
| A forged "paid" cannot mark a payment paid | Verified | `handleWebhook` never trusts the body: it calls `verifyPayment`, which re-reads the invoice from Moyasar and compares the paid amount with the amount we asked for (`gatewayAmountMatches`); a mismatch is stored as `failed`. |
| Idempotency, charge | Verified | `Idempotency-Key` required on `POST /payments/intent/*`; one live attempt per booking (partial unique index `transaction_one_active_intent_per_booking`); a repeat returns the same checkout. A booking already paid is refused (`booking_already_paid`). |
| Idempotency, webhook and verify | Verified | A transaction already `paid`/`refunded` returns at once (no second `payment.completed`); `/webhooks/moyasar` also dedups by payment id in Redis for 24 h. |
| Idempotency, refund | Verified | `RefundExecutor` is idempotent per `refund_id`, capped at the amount paid. |
| 3-D Secure return, web | Verified | Moyasar is given `callback_url`, `success_url` and `back_url` = `PAYMENT_RESULT_URL` (default `PUBLIC_APP_URL/payments/result`) with `?ref=<our transaction id>`. The web result page asks the server for the status; it does not trust the address. |
| 3-D Secure return, app | Partly verified | The app opens the hosted page in the browser and its result screen (`app/payments/result.tsx`) reads the status from the server, polls while pending and refreshes when the app returns to the foreground; it never reads `status` from the link. **Not verified:** that the return address reopens the app. The app's links are registered for host `app.nabd.plus` (paths `/ar`, `/en`, ... and `/p/`), the default return address is the web page, and no `assetlinks.json` / `apple-app-site-association` is in `patient-web/public`. Test on a device with the sandbox. |
| Failed or abandoned payment frees the slot | Verified (this PR) | `PaymentAbandonService` (every 5 min, `PAYMENT_WINDOW_MINUTES`, default 30): last gateway check, then cancels open attempts and the unpaid card consultation; money arriving later is refunded in full. A declined card inside the hosted page leaves the attempt `pending` so the patient can retry on the same page; the sweeper ends it. Lab, radiology and nursing do not hold a slot while unpaid. |
| Sandbox journey | Verified against the provider double | `tools/live/fake_moyasar.py` + `j_payment_webhook.py`, `j_web_payment_result.py`, `j_app_killed_payment.py`. Against the real sandbox: `tools/payments/record-moyasar-sandbox.mjs` (needs an `sk_test_` key). |

## What the owner must set (names only)

- `MOYASAR_API_KEY`: selects Moyasar as the gateway and signs intents. Set `MOYASAR_SECRET_KEY` to the same value: refund and capture read that name first.
- `MOYASAR_WEBHOOK_SECRET`: the same value as the secret token on the webhook in the Moyasar dashboard.
- `PAYMENT_RESULT_URL` (or `PUBLIC_APP_URL`): the public address of the result page.
- `PAYMENT_PROVIDER=moyasar` when more than one gateway key is present.
- Optional: `MOYASAR_API_BASE` (sandbox base), `PAYMENT_WINDOW_MINUTES`.
- In the Moyasar dashboard: register **one** webhook URL, `/payments/webhook/moyasar`. Two more Moyasar receivers exist (`/webhooks/moyasar`, and the legacy one in `moyasar.module.ts`); registering more than one makes every event arrive twice (safe, but noisy).
- `ZATCA_VAT_NUMBER` and `ZATCA_SELLER_NAME` for invoices (production refuses to issue without the VAT number).
