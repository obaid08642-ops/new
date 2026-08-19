# Readiness resumption — blocker reconciliation

## Purpose

This reconciliation reopens the work after the Phase 12 **NO-GO** decision. It distinguishes work that can proceed safely on the source branch from actions that require a reviewer, owner approval, external credentials or real devices. It does not deploy, change production data or activate a payment, emergency, QR, consent or location contract.

## Fresh read-only dependency audit

`npm audit --json` was rerun against the current package locks on 19 August 2026. The Admin dashboard remains at zero findings. Backend and both mobile applications retain the same high-risk migration class reported at Phase 10.

| Surface | Low | Moderate | High | Critical | Current direct constraint | Classification |
|---|---:|---:|---:|---:|---|---|
| Backend | 3 | 46 | 9 | 0 | Nest 10.4.x and SheetJS `xlsx` 0.18.5; the audit proposes a Nest 11 line for several findings, while SheetJS has no automatic safe fix. | **Source-fixable, controlled migration required** |
| Patient | 0 | 13 | 17 | 0 | Expo 54.0.36 / React Native 0.81.5; audit suggests Expo 57 as a major migration. | **Source-fixable, controlled migration required** |
| Provider | 0 | 12 | 13 | 0 | Expo 54.0.36 / React Native 0.81.5; audit suggests Expo 57 as a major migration. | **Source-fixable, controlled migration required** |
| Admin | 0 | 0 | 0 | 0 | Current lock is clean. | **No dependency action** |

The figures are a current vulnerability inventory, not permission to run an automated major update. The backend migration must first split Nest ecosystem upgrades from the unsupported `xlsx` replacement/containment decision. Each mobile migration must be executed per app with Expo compatibility checks, native config review and full gates; it cannot be inferred safe from the audit command alone.

## Remaining blocker classes

| Blocker | Class | Next admissible action | Cannot be closed by |
|---|---|---|---|
| Prescription detail authorization | Deployment-gated | Reviewer-owned deployment candidate, rollback point and live Patient1→Patient2 BOLA proof. | Local tests or archive integrity alone. |
| Backend/Patient/Provider audit findings | Source-fixable | Branch-isolated controlled migrations, clean installs, full tests/builds and new audits. | `npm audit fix --force`. |
| Moyasar | Owner/external | Owner activates account, then authorizes limited sandbox financial acceptance. | Mocking a payment or suppressing errors. |
| SOS/QR/consent/location | Legal/product gated | Written contract approval or continued fail-closed containment. | A source build or API reachability. |
| Android/iOS device validation | External credentials/device gated | EAS/Apple/GCP/Android setup plus actual device/device-farm proof. | Web export or simulator-free source review. |
| Six-language, RTL and accessibility review | Human-quality gated | Human screen-by-screen review using the documented test matrix and real render targets. | Static translation-key count alone. |
| Final production rollout | Reviewer-gated | Approved deployment, backup/rollback, smoke plan and monitoring. | A Git push. |

## Execution order

1. Treat the three dependency migration streams as separately reviewed source changes, beginning with Backend scope definition and SheetJS decision.
2. Run full gates and fresh audits for every migrated package; only then rebuild affected archives and push evidence.
3. Close source-level quality findings that do not need production or real hardware.
4. Prepare, but do not execute, the owner/reviewer deployment and external-acceptance packages.
5. Execute deployment, payment, contract and device acceptance only after explicit authorized access and a bounded test plan.

## References

[1]: NABDAH_PHASE10_FINAL_DOUBLE_CHECK_20260819.md "Phase 10 final double-check"
[2]: NABDAH_PHASE11_PRESCRIPTIONS_AUTHORIZATION_REMEDIATION_20260819.md "Phase 11 prescription detail authorization remediation"
[3]: NABDAH_PHASE12_FINAL_PRODUCTION_READINESS_REPORT_20260819.md "Final production readiness report"
