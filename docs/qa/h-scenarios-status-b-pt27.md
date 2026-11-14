# H scenarios, status B: PT-27

| ID | Scenario | Status after | Evidence | Notes |
|---|---|---|---|---|
| PT-27 | Prescription OCR result shown and corrected | PARTIAL | `patient-app/src/__tests__/pharmacy/rx-ocr.test.tsx` (new, 7 tests) | Failed or empty OCR has a clear path and nothing is saved; the extracted lines are NOT shown for editing before they are saved, and the saved list cannot be edited, removed from or added to |

## What exists
- Photo/upload way in: `src/components/pharmacy/RxIntake.tsx`. The patient picks a photo and presses save (`scan-save`); only then the client calls POST `/ai/prescription-ocr` (line 69), and if lines come back POST `/prescriptions/upload` with `items` as read (line 76-79) and `notes` tagged for pharmacy review, then opens `/pharmacy/rx-order?prescriptionId=` (line 82).
- OCR returning no lines: nothing is saved, the "unreadable" notice shows (line 71-74). Any thrown error: "save" error notice. The Segmented control keeps the typed way in (`via=type`, `ManualRequest`) one tap away.
- Saved prescription view: `app/pharmacy/rx-order.tsx` lists named lines (name, dose, quantity only if sent), drops unnamed lines, offers "continue" to checkout, or "upload new" when there are no lines.
- A separate flow, the assistant's prescription mode (`src/components/ai/AssistantView.tsx:175`, POST `/ai/ocr-translate`), only reads and translates; it shows the medicines, nothing is submitted.

## What I tested
Nothing is sent before save and save is disabled without a photo; save sends exactly the OCR lines plus the image to `/prescriptions/upload` and opens the saved prescription; empty OCR saves nothing, shows the unreadable notice, and the typed way is reachable; OCR failure saves nothing and shows the error; refused camera permission shows the notice and opens no camera; the saved list (named lines, dose, quantity only when sent, continue to checkout); no lines gives upload-new and no continue.

## What I fixed
Nothing in app code. The brief's "each can be edited/removed/added before sending" does not exist in the app; it is a missing feature, not a defect in existing code, so it is not built here.

## Gaps for the reviewer
- [client] No review step: OCR text is saved as a prescription before the patient has seen it (`RxIntake.tsx:69-79`). The saved prescription is later reviewed by the pharmacy (`OCR_TAG` note) and the patient sees the lines on `rx-order.tsx`, but cannot correct, remove or add a line there. Proposed: show the OCR lines after reading with remove/edit/add and an explicit confirm before POST `/prescriptions/upload`; needs a design board and owner approval, not built.
- [client] No confidence is surfaced: the client reads only `items`; whether `/ai/prescription-ocr` returns a confidence was not checked in the DTO, so low-confidence results are treated like good ones.

## Not verified
- Live `tools/live/j_ai_scanner.py` (no backend here); real camera/photo picking on a device; the assistant OCR-translate result screen was not tested here.
