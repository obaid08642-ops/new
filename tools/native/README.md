# Native E2E (Android)

`.github/workflows/native-e2e.yml` builds release APKs of patient-app and provider-app, starts the real test
stack on the runner (backend, MongoDB, Redis, S3/SMTP/payment doubles, admin BFF), seeds data with the live
journeys (`seed.py`), signs in with the Maestro flows (`flows/`) and crawls every screen on an Android
emulator (`native_crawl.py`). `report.py` merges the shards into `NATIVE_REPORT.md` (artifact `native-report`).

Test-build-only workarounds in `build_android.sh` are each tied to an open defect (Q58, Q62, Q63, Q67, Q68);
remove them as the agent fixes those defects, so the run proves the real build.
# native verification of Q71 (second cause) 2026-10-03

- 2026-10-04: run on the agent tip bb97c87 with the Q58/Q62/Q67/Q68 workarounds off (STRICT).
- 2026-10-04: strict run on fix/audit-2026-09 1b12107 (reviewer fixes incl. Q58 lock, Q69 map guard), all workarounds off.
