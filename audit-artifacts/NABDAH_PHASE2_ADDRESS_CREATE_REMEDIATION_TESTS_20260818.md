# Patient addresses — remediation test contract

## Expected flow

The `إضافة عنوان جديد` action must open a real form and submit through `POST /users/me/addresses`. The form must validate the required address fields, show loading state, preserve entered data on recoverable failure, display a localized error, and refresh the collection after success.

## Required checks

| ID | Check | Expected result |
|---|---|---|
| ADDR-01 | Button press | Opens create-address form; no silent no-op |
| ADDR-02 | Empty submission | Client validation blocks request and identifies required fields |
| ADDR-03 | Valid submission | Sends `POST /users/me/addresses` with authenticated user context |
| ADDR-04 | Success | New address appears in list and can be selected as default |
| ADDR-05 | API 4xx/5xx | Error is visible, entered values remain, retry is possible |
| ADDR-06 | Double tap | One mutation only or idempotent request; no duplicate address |
| ADDR-07 | Ownership | Another user cannot read or mutate the address |
| ADDR-08 | Offline/timeout | Loading ends, localized retry state appears, no false success |
| ADDR-09 | RTL/LTR | Labels, fields, validation, and buttons remain readable and correctly ordered |
| ADDR-10 | Accessibility | Button and fields have labels, focus order, and sufficient touch target |

This file is a Phase 2 defect specification; it is not a source change and does not claim the fix is implemented.
