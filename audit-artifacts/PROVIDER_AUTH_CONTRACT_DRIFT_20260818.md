# Provider auth contract drift — 2026-08-18

`provider-app/src/api/provider.ts` exposes a dormant `ProviderApi.login(phone, password)` helper that posts to `/auth/login` with `{ phone, password }`. A source-wide search found no current screen consumer of this helper. The controlled production sandbox probes that succeeded used `POST /provider/auth/login` with `{ email, password, meta.device_identifier }`.

The current Provider onboarding flow uses `start`, `step2`, `step3`, `submit`; its login helper is not an active consumer in the inspected source. Therefore this is classified as **DORMANT_CONTRACT_DRIFT**, not patched speculatively. Before release, either remove the unused helper or update it to the approved provider-auth contract and add a direct auth test; do not silently switch its semantics while a future screen may depend on phone-based `/auth/login`.
