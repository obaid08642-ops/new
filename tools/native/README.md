# Native E2E (Android, Maestro)

`.github/workflows/native-e2e.yml` builds a release APK of patient-app or provider-app, starts the real test stack on the
runner (backend, MongoDB, Redis, S3/SMTP/payment/Saudi Post/ClamAV doubles, admin BFF), seeds data with the live journeys
(`seed.py`), runs the Maestro flows on an Android emulator (`flows/`) and, if asked, crawls every screen
(`native_crawl.py`). `report.py` merges the results into `NATIVE_REPORT.md` (the run summary and the artifact `native-report`):
pass/fail per Maestro flow first, then the crawl.

**Manual only** (`workflow_dispatch`): it is slow and costs runner minutes, so there is no pull_request or push trigger.
Inputs: `app` (patient | provider), `flow` (part of a flow file name, `all` or `none`; default `login`), `crawl`
(true/false, default false) and `target` (patient shard `0/6`..`5/6` or provider type; empty = the first, `all` = every one).
From a terminal: `gh workflow run native-e2e.yml --ref <branch> -f app=patient -f flow=login`.

Flows are `flows/<app>_<name>.yaml` (`patient_login`, `provider_login`). The patient flows find controls by testID
(onboarding-language, language-continue, onboarding-skip, welcome-login, login-identifier, login-password, login-submit);
provider-app has no testIDs on its sign-in screens, so its flow uses their text. `routes.py` reads the patient routes from
`patient-app/app`, so the crawl follows today's screens.

Test-build-only workarounds in `build_android.sh` are each tied to an open defect (Q58, Q62, Q63, Q67, Q68); they are detected
from the checkout (a `jcenter()` user, a duplicate WebRTC, a version mismatch), so each switches itself off once its defect is fixed.
