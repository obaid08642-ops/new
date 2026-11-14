# Moyasar fixtures

Documented-shape payloads (https://docs.moyasar.com) used by `src/modules/payments/moyasar-sandbox.spec.ts`.
They carry no real key, id or card: the ids are random UUIDs and the webhook `secret_token` is the dummy
`whsec_FIXTURE_NOT_A_REAL_SECRET`. CI never calls Moyasar.

To refresh them from a real sandbox, run `tools/payments/record-moyasar-sandbox.mjs` with the sandbox key in the
environment of the machine that runs it (never in the repo or in chat), review the output, and replace the ids/secrets
with placeholders before committing.
