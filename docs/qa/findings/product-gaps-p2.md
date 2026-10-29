# Product gaps, P2 (for S and Design): 2026-10-29

Both rows are blocked by a missing product feature, not by the test stack. Listed here for S and Design to decide.

| ID | Severity | Gap | Evidence | Owner |
|---|---|---|---|---|
| I-03 | P2 | A patient cannot delete an insurance card. The card routes have GET and POST only; there is no delete. | `backend/src/modules/users/user.insurance.controller.ts` (GET and POST routes only, no `@Delete`); `docs/qa/findings/insurance-delete.md`. | S decides whether a card can be removed (and what happens to open insurance requests); Design adds the control. |
| A-08 | P2 | The patient web has no control to edit the profile name or phone. The profile and account screens only read `GET /users/me`; only the security (2FA) and notification switches save. | `patient-web/app/[locale]/settings` and `patient-web/components-next/settings`: no name or phone form. Checked 2026-10-29. | Design adds the edit control; S confirms the rules for changing a phone number (it is the sign-in identifier). |

Scenario rows: I-03 and A-08 stay BLOCKED with these reasons until the feature exists.
