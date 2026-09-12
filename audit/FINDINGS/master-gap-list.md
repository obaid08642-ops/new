# Master Gap List — R1–R82 + Additions 1–23

Source of truth: `audit/FINDINGS/gap-matrix.md` (66 lines, fully verified). Status vocabulary:
PASS / PARTIAL / UNCERTAIN / FAIL / BLOCKED / in-progress. Priority: P0–P3; a literal `BLOCKED`
in the P column means the requirement cannot be closed until an external dependency resolves.

## Reconciled totals (sum = 82)

| Status | Count | Rows |
|---|---|---|
| PASS | 22 | R4, R8, R23, R32–R48 (17 merged), R52, R73 |
| PARTIAL | 49 | all remaining closed rows except FAIL/UNCERTAIN/BLOCKED below |
| UNCERTAIN | 3 | R49, R56, R77 |
| FAIL | 1 | R66 |
| BLOCKED | 2 | R28 (external DNS), R76 (app-store metadata) |
| in-progress | 5 | R78–R82 (this plan/audit) |

Verified row anchors in `gap-matrix.md`: R23→L28, R28→L33, R57→L46, R66→L50, R71→L55,
R72→L56, R73→L57, R74→L58, R75→L59, R76→L60, R77→L61, R78–R82→L62.

## Open rows by area

### Backend (`backend/`)
| Row | Status | Pri | Gap / evidence |
|---|---|---|---|
| R1 | PARTIAL | P1 | Abandoned 2nd backend `backend/infra/fastapi/`, dead MySQL config, provider-wallet duplication ×5, orphan `compat/admin-spa` |
| R2 | PARTIAL | P0 | 12 active fake/mock items — evidence in `FINDINGS/mock-data.md` |
| R3 | PARTIAL | P1 | Provider/app contract gap; contract-test failures `PharmacyDashboard.tsx`, `DoctorDashboard.tsx`, `NursingFieldOps.tsx` |
| R9 | PARTIAL | P1 | Pending per `gap-matrix.md` |
| R10 | PARTIAL | P0 | Pending per `gap-matrix.md` |
| R11 | PARTIAL | P0 | Pending per `gap-matrix.md` |
| R13 | PARTIAL | P2 | Pending per `gap-matrix.md` |
| R17 | PARTIAL | P1 | Pending per `gap-matrix.md` |
| R19 | PARTIAL | P1 | Pending per `gap-matrix.md` |
| R22 | PARTIAL | P1 | Pending per `gap-matrix.md` |
| R28 | PARTIAL | BLOCKED | External DNS `mcp.nabd.plus` (L33) — cannot close until domain resolves |
| R29 | PARTIAL | P2 | Pending per `gap-matrix.md` |
| R31 | PARTIAL | P2 | Pending per `gap-matrix.md` |
| R50 | PARTIAL | P0 | Breach handling, unmerged security branches, IDOR test gap → P11; `FINDINGS/backend-security.md` |
| R51 | PARTIAL | P0 | Default-deny + ownership ✅; leak/authorization audit open → P11 |
| R58–R63 | PARTIAL | P1 | 117-entry spec, e2e, contracts ✅ (`FINDINGS/verify-p8p9p10.md`); per-module specific tests open → P11 |
| R64 | PARTIAL | P2 | Pending per `gap-matrix.md` |
| R65 | PARTIAL | P2 | Pending per `gap-matrix.md` |
| R67 | PARTIAL | P1 | Pending per `gap-matrix.md` |
| R68 | PARTIAL | P1 | Pending per `gap-matrix.md` |

CI (red, `nabdah-plus/full-completion`): `src/common/auth.guard.spec.ts` (impersonation rejects),
`src/modules/pharmacy/.../pharmacy-journey-spec.spec.ts` (DTO deep-equality),
`src/modules/search-intent/search-intent.service.spec.ts` (Jeddah district disambiguation),
`src/modules/slot-locks/slot-locks.service.spec.ts` (`validateForBooking` resolves).

### Patient Web (`patient-web/` — 270 pages, 60 BFF routes)
| Row | Status | Pri | Gap / evidence |
|---|---|---|---|
| R5 | PARTIAL | P2 | Pending per `gap-matrix.md` |
| R6 | PARTIAL | P1 | Pending per `gap-matrix.md` |
| R12 | PARTIAL | — | Pending per `gap-matrix.md` |
| R14 | PARTIAL | P1 | Pending per `gap-matrix.md` |
| R16 | PARTIAL | P1 | Pending per `gap-matrix.md` |
| R18 | PARTIAL | P1 | Pending per `gap-matrix.md` |
| R20 | PARTIAL | P1 | Pending per `gap-matrix.md` |
| R21 | PARTIAL | P2 | Pending per `gap-matrix.md` |
| R24 | PARTIAL | P1 | Pending per `gap-matrix.md` |
| R26 | PARTIAL | P1 | Pending per `gap-matrix.md` |
| R30 | PARTIAL | P1 | Pending per `gap-matrix.md` |
| R49 | UNCERTAIN | P1 | Pending per `gap-matrix.md` |
| R53 | PARTIAL | P2 | Pending per `gap-matrix.md` |
| R54 | PARTIAL | P1 | hreflang + 6 locales ✅ (`b40136bb`); JSON-LD + per-language sitemaps (21) open → P9 |
| R55 | PARTIAL | P3 | Pending per `gap-matrix.md` |
| R56 | UNCERTAIN | P2 | Pending per `gap-matrix.md` |
| R57 | PARTIAL | — | L46 |
| R69 | PARTIAL | P2 | Pending per `gap-matrix.md` |
| R70 | PARTIAL | P2 | Pending per `gap-matrix.md` |
| R71 | PARTIAL | P2 | L55 |
| R74 | PARTIAL | P2 | L58 |
| R75 | PARTIAL | P3 | L59 |
| R77 | UNCERTAIN | P2 | L61 |

CI (red): `app/api/auth/convert-guest/route.ts:38-39` — `string | undefined` not assignable to
`string`.

### Patient App (`patient-app/` — 249 screens, 6 languages)
| Row | Status | Pri | Gap / evidence |
|---|---|---|---|
| R7 | PARTIAL | P0 | Pending per `gap-matrix.md` |
| R15 | PARTIAL | P2 | Pending per `gap-matrix.md` |
| R25 | PARTIAL | P2 | Pending per `gap-matrix.md` |
| R72 | PARTIAL | P3 | L56 |

Note: Expo drift — patient v57 / provider v54 (unification scheduled P6-D, see `PROGRESS.md`).

### Provider App (`provider-app/` — 8 roles, 7 wizards)
| Row | Status | Pri | Gap / evidence |
|---|---|---|---|
| R3 | PARTIAL | P1 | 3 contract-test failures (PharmacyDashboard, DoctorDashboard, NursingFieldOps) |

### Admin (`compat/admin-spa` — 51 admin pages)
| Row | Status | Pri | Gap / evidence |
|---|---|---|---|
| R1 | PARTIAL | P1 | Orphan legacy admin SPA to reconcile/drop |

## Closed rows
- **PASS (22):** R4, R8 (R8–R23 group), R32–R48 (17 merged requirements), R52, R73.
- **FAIL (1):** R66 — P0, L50.  Remaining FAIL requirement (highest-visibility).

## BLOCKED (external) — cannot close without dependencies
- **R28** — MCP public DNS `mcp.nabd.plus` must resolve.
- **R76** — app-store metadata requires store credentials/manual submission.

## Additions 1–23 (plan v3.1)
- Additions 1–17: scoped inside `audit/AUDIT_PLAN.md` (phase/step breakdown); not re-listed here.
- Addition 18 — journey optimization.
- Addition 19 — audit documentation system.
- Addition 20 — double testing.
- Addition 21 — Multilingual-Everything.
- Addition 22 — device matrix.
- Addition 23 — ultra-premium design.

## Notes
- Zero rule in force: every fix must be evidenced with a real `file:line` from this list or the live
  codebase; no mock/hallucinated data; `exists ≠ complete`.
- Reconciliation covers R1–R82; package totals 22+49+3+1+2+5 = 82.