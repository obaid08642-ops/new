# Prescription upload (P-15): findings (2026-10-29)

Journey: `tools/live/j_qa_rx_upload.py`, local stack (main build, ClamAV double on 3311, UPLOAD_SCAN=required). 9 of 10 steps pass.

| ID | Severity | Finding | Evidence | Fix (owner decision first) |
|---|---|---|---|---|
| RX-1 | P1 | A prescription is accepted with any string as its image reference: the file is not checked to exist, to belong to the patient, or to have been scanned. The pharmacy and admin then see a prescription with no image. | Run 2026-10-29: `POST /prescriptions/upload` with `upload_image: "eicar-not-stored"` answers 201 and stores `state: UPLOADED_BY_PATIENT`. Code: `backend/src/modules/prescriptions/prescriptions.service.ts` `uploadByPatient` (no storage lookup); DTO `backend/src/modules/prescriptions/prescriptions.dto.ts:53-56` (`upload_image` is only `IsString`). | Check that `upload_image` is a stored object of this patient that passed the scan, and refuse the request otherwise. |
| RX-2 | info | Upload scanning depends on the environment. Locally, `start-backend.sh` sets `UPLOAD_SCAN=required` and the scanner is up. In production the code requires the scan only when `UPLOAD_SCAN` is unset (`backend/src/modules/storage/clamav.service.ts:18-24`: `required` or `optional`; `optional` lifts the scan). The lead's report that uploads are open in production has not been checked from here (no production env access). | `backend/src/modules/storage/clamav.service.ts:18-24`; `tools/live/start-backend.sh:39-40`. | Ops to confirm `UPLOAD_SCAN` on production is `required`, or unset. |

What passes: the patient uploads a PDF to private storage; the scanner passes it; the prescription is submitted, linked to the patient in MongoDB, and listed back to the patient. The EICAR test file is refused by the scan and returns no object id.

P-15 status: the upload path works end to end. The row stays PARTIAL until RX-1 is decided and fixed.
