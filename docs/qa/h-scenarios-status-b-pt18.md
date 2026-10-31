# H scenarios, status B: PT-18

| ID | Scenario | Status after | Evidence | Notes |
|---|---|---|---|---|
| PT-18 | Insurance policy edit | PARTIAL | `patient-app/src/__tests__/insurance/insurance-edit-policy.test.tsx` (new, 7 tests) | Edit saves through the right endpoint with validation and error copy; the app gives no warning that editing resets verification; add-policy screen cannot edit |

## What exists
- No PATCH or PUT policy endpoint exists in the app or the backend. An edit is a save: the hub's "Change" button opens the insurer sheet (`src/components/insurance/InsuranceHubView.tsx`, `InsurerSheet`) that POSTs `/users/me/insurance` (`backend/src/modules/users/users.insurance.controller.ts:58`). `app/insurance/add-policy.tsx` POSTs `/insurance/save-policy` (`insurance-engine.module.ts:277`, `savePolicy`). Both go through `buildPatientPolicy` (`backend/src/common/insurance-policy.ts:74`): saved fields are merged with the sent ones, and `verified` is ALWAYS set to false (the client's value is ignored).
- The card shows "Verified" or "In review" from the server's `verified`.

## What I tested (new)
- The sheet starts from the saved policy number and member id; saving sends the changed number to POST `/users/me/insurance` with the saved class kept; the policy is read again and the card turns to "In review" (the server reset it); no insurer chosen or a cleared number sends nothing and shows the required-field copy; a copay percent above 100 sends nothing; a failed save shows `insurance.insurer.failed` and the sheet stays; a verified policy shows "Verified".

## What I fixed
- `InsuranceHubView.tsx` (`InsurerSheet`): the edit sheet always sent `class: 'A'`, overwriting the patient's saved class on every edit, and started with empty number and member id so an edit forced retyping them. It now receives the saved policy, pre-fills number and member id, and sends the saved class (`'A'` only when none is saved, because the server requires a class with an insurer). No new user-visible text.

## Backend gaps (not changed)
- The backend never refuses an overwrite: a policy that is verified or under review is replaced by any later save, and `verified` goes back to false. This is by design (comments in the controller), but the patient is not told. A guard or a re-verification notice would be a backend/product decision.
- Two save endpoints with different bodies (`/users/me/insurance` and `/insurance/save-policy`) for the same record.

## Client gaps (reported, not built)
- No warning before editing a verified policy that verification will be reset (needs new copy in six languages and an owner decision).
- The sheet does not pre-select the saved insurer (the saved `provider` is a code or a name; mapping it to the catalogue was not verified), so the insurer must be chosen again.
- The add-policy screen has no edit mode.

## Not verified
- Live `j_insurance.py`; real catalogue responses; the CHI lookup; the add-policy screen's save (existing code, not tested here).
