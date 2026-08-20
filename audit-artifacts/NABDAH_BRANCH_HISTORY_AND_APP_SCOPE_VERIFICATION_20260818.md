# Nabdah branch history and application scope verification — 2026-08-18

The conversation-history question was verified against the Git graph of `obaid08642-ops/new`.

## Branch that received the work

The remediation commits discussed in the prior work were pushed to **`manus/on-live-reconciliation`**, and later that branch was merged/synchronized into `main`. The old branch `fix/e2e-operational-contracts-20260814` does not contain the later remediation commits.

| Commit | Scope | On reconciliation | On old fix branch |
|---|---|---:|---:|
| `41d1103` | Provider intake restoration and placeholder removal | Yes | No |
| `f2bffa28` | Global effective-role/RolesGuard fix | Yes | No |
| `f6fa8a8` | Order report ownership and PDF repair | Yes | No |
| `d2ef9a8` | OTP/2FA closure and gateway error hardening | Yes | No |
| `5bb20b5` | Fail-closed Phase 6 contract drafts | Yes | No |
| `ba0ca17` | ChatGateway circular-dependency repair | Yes | No |
| `56b4144` | Communications stack hardening | Yes | No |
| `859e5b7` | Admin and Expo web build validation | Yes | No |
| `e9fdd1b` | Provider archive refresh from restored source | Yes | No |

## Application scope

The reconciliation branch is **not Backend-only**. Its cleaned single-artifact structure contains all four application deliverables as committed archives:

| Application | Artifact | Current branch presence |
|---|---|---:|
| Backend | `nabdah-backend.zip` | Present |
| Patient app | `nabd_plus_patient_app.zip` | Present |
| Provider app | `NabdProvider-provider.zip` | Present |
| Admin dashboard | `Napd-admin-dashboard.zip` | Present |

The branch does not expose the four applications as unpacked root directories after the cleanup commit `d59a8bfa`; the source must be extracted from these committed archives for builds and detailed source inspection.

## Conclusion

The earlier statement that the old `fix/e2e-operational-contracts-20260814` branch was the current executable source was wrong after the later reconciliation commits. The correct branch for the latest combined Backend + Patient + Provider + Admin artifacts and all subsequent work is **`manus/on-live-reconciliation`**, currently advanced beyond `d59a8bfa` by the documentation commit created during this verification.
