# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `server/storage.ts`
- **Member SHA-256:** `55eab39960d991bfbd50e86fb586fd6842fff88bcc7ab6d3538982a3fd9dd860`
- **Line count:** 97
- **Read range:** `1-97`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `2: // Uploads via Forge Server presigned URL to S3 (PUT direct).`
- `3: // Downloads return /manus-storage/{key} paths served via 307 redirect.`
- `61: const uploadResp = await fetch(s3Url, {`
- `67: if (!uploadResp.ok) {`
- `68: throw new Error(`Storage upload to S3 failed (${uploadResp.status})`);`
### backend_consumers_or_contracts
- `43: const presignResp = await fetch(presignUrl, {`
- `61: const uploadResp = await fetch(s3Url, {`
- `86: const resp = await fetch(getUrl, {`
### auth_ownership
- `44: headers: { Authorization: `Bearer ${forgeKey}` },`
- `87: headers: { Authorization: `Bearer ${forgeKey}` },`
### state_transitions
- `12: throw new Error(`
- `48: const msg = await presignResp.text().catch(() => presignResp.statusText);`
- `49: throw new Error(`Storage presign failed (${presignResp.status}): ${msg}`);`
- `53: if (!s3Url) throw new Error("Forge returned empty presign URL");`
- `68: throw new Error(`Storage upload to S3 failed (${uploadResp.status})`);`
- `91: const msg = await resp.text().catch(() => resp.statusText);`
- `92: throw new Error(`Storage signed URL failed (${resp.status}): ${msg}`);`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `12: throw new Error(`
- `48: const msg = await presignResp.text().catch(() => presignResp.statusText);`
- `49: throw new Error(`Storage presign failed (${presignResp.status}): ${msg}`);`
- `53: if (!s3Url) throw new Error("Forge returned empty presign URL");`
- `68: throw new Error(`Storage upload to S3 failed (${uploadResp.status})`);`
- `91: const msg = await resp.text().catch(() => resp.statusText);`
- `92: throw new Error(`Storage signed URL failed (${resp.status}): ${msg}`);`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
