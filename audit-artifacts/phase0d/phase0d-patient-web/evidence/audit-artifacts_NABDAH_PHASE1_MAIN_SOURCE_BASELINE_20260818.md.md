# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE1_MAIN_SOURCE_BASELINE_20260818.md`
- **Member SHA-256:** `9fe0d41ad2262b1688328a2f49ffbe13ff41a3bc0ae026ed1bad93792837aa1e`
- **Line count:** 65
- **Read range:** `1-65`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `65: **Phase 1 is complete for the requested `main` baseline.** Phase 2 must not begin automatically. It requires the owner’s explicit instruction to proceed. The next phase will inventory Patient screens, buttons, states, and contracts from the`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `5: Phase 1 was executed after the owner explicitly instructed: pull the latest version from `main`. The source baseline is therefore `origin/main` from `obaid08642-ops/new`, while the QA evidence and plan history remain recorded on `manus/on-l`
- `32: | Admin | `Napd-admin-dashboard.zip` | 66 | `web-admin/package.json` |`
- `42: | `main` | `53ba7da` | Owner-requested source baseline for the current phase |`
- `45: The four archive SHA-256 values from `main` were recorded during extraction. They differ from the archive values on the reconciliation branch, so the two refs must not be silently mixed. For Phase 1 and subsequent source inspection, use the`
- `56: | Pull latest owner-requested `main` | PASS | Main worktree at `53ba7da`, equal to `origin/main` |`
- `58: | Identify Backend, Patient, Provider, Admin | PASS | Four archives and extracted manifests |`
- `65: **Phase 1 is complete for the requested `main` baseline.** Phase 2 must not begin automatically. It requires the owner’s explicit instruction to proceed. The next phase will inventory Patient screens, buttons, states, and contracts from the`
### state_transitions
- `12: | Approved source ref | `main` |`
- `18: | Main worktree status | clean |`
- `34: The Backend archive is the location to inspect for server, schema, migrations, and database contracts. Production database data is not contained in Git and requires separate approved backup/database verification.`
- `53: | Phase 1 requirement | Status | Evidence |`
- `65: **Phase 1 is complete for the requested `main` baseline.** Phase 2 must not begin automatically. It requires the owner’s explicit instruction to proceed. The next phase will inventory Patient screens, buttons, states, and contracts from the`
### payment_insurance_relevance
- `49: No production mutation was performed in Phase 1. No non-sandbox account was used. No source code was modified in the main baseline. The phase only fetched, compared, extracted, and documented artifacts. Payment, legal, device, and productio`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
