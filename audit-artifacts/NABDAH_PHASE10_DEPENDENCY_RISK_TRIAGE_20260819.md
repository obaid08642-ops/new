# Phase 10 — dependency risk triage

## Triage decision

The Phase 10 read-only audit separated low-risk lockfile updates from framework migrations and packages with no published fix. Only the Admin dependency tree qualified for immediate non-breaking remediation and was reduced to zero audit findings. The remaining application trees are not safe candidates for a blind `npm audit fix --force`.

| Surface | Initial audit total | High | Triage | Decision |
|---|---:|---:|---|---|
| Admin | 6 | 6 | Direct Next.js patch plus transitive lockfile updates were available and verified. | **Remediated** — 0 findings; see `NABDAH_PHASE10_ADMIN_DEPENDENCY_AUDIT_REMEDIATION_20260819.md`. |
| Backend | 58 | 9 | Nest platform/CLI/Swagger paths report fixes requiring major-line migrations; direct `xlsx` advisories have no published automatic fix. | **Deferred for controlled migration/replacement**. |
| Patient | 30 | 17 | Most high paths resolve through Expo/Metro/React Native and point to Expo SDK 57 or incompatible React Native migration advice. | **Deferred for dedicated Expo SDK migration**. |
| Provider | 25 | 13 | High paths likewise depend on Expo/React Native ecosystem migrations; clean installation was repaired separately. | **Deferred for dedicated Expo SDK migration**. |

## Evidence-based constraints

Backend high-risk paths include framework upgrade candidates for `@nestjs/platform-express` and tooling paths (`@nestjs/cli`/glob/picomatch/tmp), plus direct `xlsx` findings that do not provide a published automated fix. Patient findings include Expo/Metro/image tooling and React Native advisory paths whose offered resolution is a major SDK migration. Such upgrades affect build tooling, native configuration, maps, notifications, Firebase, LiveKit and test behavior; they require a separate compatibility matrix and device regression evidence.

## Required remediation approach

No force update or transitive override will be applied to Backend, Patient or Provider in this phase. The next remediation package must: inventory runtime versus development reachability; choose vendor-supported target versions; assess `xlsx` replacement or input isolation; make one compatibility family change at a time; rerun clean install, unit/contract/build gates and mobile/device evidence; and document a rollback point. Until that work completes, the residual findings remain an explicit deployment blocker.
