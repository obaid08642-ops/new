# Patient Mobile: Maternity profile, estimates and fetal content — manual review

## Scope boundary

This static review covers all seven Maternity inventory entries. It does not validate pregnancy or cycle data, clinical correctness, patient age/guardian eligibility, use as contraception/diagnosis, calculation correctness across locales/time zones, content licensing, or backend access controls.

| Reviewed source | Scope |
|---|---|
| `app/maternity/maternity-setup.tsx` | Pregnancy/cycle profile submission |
| `app/maternity/hub.tsx` | Profile display and locally calculated dates |
| `app/maternity/pregnancy-tracker.tsx` | Redirect to hub |
| `app/maternity/ovulation-tracker.tsx` | Redirect to hub |
| `app/maternity/baby-development.tsx` | Redirect to hub |
| `app/maternity/baby-growth.tsx` | Redirect to hub |
| `app/maternity/fetus-data.ts` | Static 1–40 week fetal-growth/development table |

## Evidence-backed findings

| ID | Classification | Evidence | Finding | Required closure evidence |
|---|---|---|---|---|
| PM-MAT-001 | `STATIC_MATCHED_PARTIAL` | `maternity/maternity-setup.tsx:12–16` | Setup submits sensitive pregnancy/cycle fields to `/maternity/profile`, validates only non-empty free-text dates and, in cycle mode, presence rather than a medically plausible numeric cycle length. It routes to the hub after any 2xx without showing returned profile/version or authoritative estimates. | DTO/schema/ownership and validation evidence; date/timezone/age/guardian policy; confirmation of stored scope; edit/history/delete and consent model. |
| PM-MAT-002 | `CONFIRMED_DEFECT` | `maternity/hub.tsx:17–24` | Hub computes ovulation, fertile window and next period entirely from client `Date` arithmetic using profile data; the prominent estimates are not linked to clinical source/version, locale/timezone policy or medical review. The redirects leave no dedicated reviewable tracking workflow. | Server/clinically governed estimate model with source/version/disclaimer; time-zone/DST and irregular-cycle behavior; safety escalation and test evidence. |
| PM-MAT-003 | `MISSING_CAPABILITY` | `maternity/pregnancy-tracker.tsx:1–3`; `maternity/ovulation-tracker.tsx:1–4`; `maternity/baby-development.tsx:1–3`; `maternity/baby-growth.tsx:1–3` | Pregnancy tracker, ovulation tracker, baby development and baby growth routes are redirects to the hub. Their comments explicitly defer clinically reviewed development/growth interpretation; the routes do not implement dedicated workflows or charting. | Product decision/contract for each required feature, clinically approved content/workflow, escalations and truthful discovery/navigation state. |
| PM-MAT-004 | `CONFIRMED_DEFECT` | `maternity/fetus-data.ts:13–175` | Fetal content is an embedded unversioned local table with no clinical source, reviewer, update date, localization/content governance or profile linkage. Weeks 10 and 11 refer to the week-17 image asset; week 34 contains a text-quality defect. This is source-confirmed content integrity risk. | Clinically reviewed/versioned/licensed content source; content QA and locale review; per-week asset correctness; safety/disclaimer and publication governance. |

## Conclusion

The Maternity surface stores and displays sensitive reproductive-health data, but the reviewed source cannot support medical, contraception, pregnancy-tracking or fetal-growth accuracy claims. It includes client-side fertility arithmetic, intentionally deferred dedicated trackers, and ungoverned static fetal content with confirmed asset/text defects. Completion here means only manual source review is complete for the seven inventory paths.
