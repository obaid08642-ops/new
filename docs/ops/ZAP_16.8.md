# Dynamic testing (16.8)

`.github/workflows/zap.yml` runs nightly, on demand and when its files change:
- **api**: `zap-api-scan.py` over `/api/docs-json` of a backend built from the commit, with a patient bearer token on every request (`tools/security/zap/patient_token.py`), ZAP image `2.17.0`.
- **web**: `zap-baseline.py` over the patient website (`/en`) and the admin sign-in page.
- `tools/security/zap/zap_gate.py` fails on any High alert, on a missing or empty report, and on an entry of `tools/security/zap/accepted.json` that no longer appears. Medium alerts are printed. The HTML reports are kept 30 days as artifacts.

The stack is a throw-away copy (fresh Mongo, test doubles). **Staging or production is never scanned from CI**: that is the owner's call, and the plan's "against staging" needs a staging URL and the owner's approval to run active rules there.

The old ZAP step in `live-gate.yml` was removed: it was `continue-on-error`, scanned only `/health`, and read a key (`alerts`) that ZAP's JSON does not write at the top level (it writes `site[].alerts`), so it could not fail.

## Not done (owner)
- The external penetration test before launch and the bug bounty (plan 16.8 lines 2 and 3) are the owner's.
