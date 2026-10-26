# QA findings: jobs inbox, messages and the hospital token (JB-04, JB-06)

Journeys: `tools/live/j_qa_jobs_inbox.py` (JB-06), `tools/live/j_jobs.py` (JB-03, JB-04, re-run 2026-10-26).
Stack: local test stack, backend :8002, test data only.

| Sev | Where | What happens (real response) | Expected | Owner |
|---|---|---|---|---|
| P1 | `backend/src/modules/recruitment/recruitment.module.ts:322` (`createJob`) | A hospital signed in through the provider app cannot post a job: `POST /recruitment/jobs` → 403 `Only healthcare facilities, clinics, doctors and admins can post jobs`. The provider token's JWT has `role: "provider"` and `scope: "provider"` (the `@Roles` guard lets it through, the in-method list does not contain `provider`). The same job post passed earlier (JB-04). | A hospital account posts jobs from the provider app. | S (backend) |
| P2 | `recruitment.module.ts:274` (`updateApplicationStatus`) | No notification is sent to the candidate when the job side moves the application (`GET /notifications` for the candidate: 0 rows after `under_review`). | The candidate is told of the status change. | S (backend) + Design (copy) |
| P2 | `recruitment` controller | No messages between the candidate and the job side: `GET/POST /recruitment/applications/:id/messages` and `GET /recruitment/jobs/:id/messages` answer 404 `Cannot GET ...`. | Either a built thread or an explicit decision that there is none. The owner decides whether it is in scope. | Owner decision, then S |
| P3 | `updateApplicationStatus` | Any valid status can follow any other (only the value list is checked): e.g. `under_review` is accepted after `rejected` if the job side sends it. | A transition rule, or a documented choice that the job side may correct a status. | S (backend) |

Passing in the same runs: the candidate saves a profile, applies (201), the application is `submitted` in MongoDB (`job_applications`), the job side moves it to `under_review` (MongoDB updated), the candidate reads it back via `GET /recruitment/applications/my`. Guest draft publish by the admin (`j_jobs.py`, JB-03) passes on the API. The admin job screen is not in the admin app, so only the API path is proven.

Note for the matrix: JB-04 (hospital posts a job) was PARTIAL and now fails at the facility step; treat it as open until the P1 above is fixed.
