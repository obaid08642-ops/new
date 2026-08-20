# Phase 8 — Batch Y: laboratory lifecycle and workflow integrity

## Purpose

The lab surface had multiple lifecycle bypasses. Sample registration accepted `NEW_REQUEST` and wrote booking state directly; sample stages could leap directly from received to result-ready; uploading a report changed booking state outside the workflow engine; `lab-results` created results for any authenticated caller and directly marked the booking as reported. The Provider UI compounded this with direct booking-state mutations, unsupported sample stages, placeholder PDF names and hard-coded clinical results.

## Source change

| Surface | Implemented control |
|---|---|
| Legal lab transition map | `RESULT_UPLOADED → REPORTED` is now an explicit domain transition. |
| Sample registration | Requires an owned lab booking in `CONFIRMED`, `IN_TRANSIT` or `IN_LAB`; `NEW_REQUEST` cannot become sample-collected. The booking mutation runs inside `WorkflowEngineService.apply`. |
| Sample stages | The only sample sequence is `received → analyzing → result_ready → sent`. Booking stages advance through the workflow engine for analyzing and result-ready; sending is blocked until the booking is reported. |
| Report release | Report persistence is allowed only from `RESULT_UPLOADED` or an existing `REPORTED` booking. The release transition uses the workflow engine instead of an unmanaged direct state write. |
| Structured lab results | `LabResultsService.create` now requires an assigned lab/hospital provider or admin, requires `RESULT_UPLOADED`, and creates/releases the result inside the workflow engine. A foreign provider or an early state cannot create a result. |
| Provider UI | Sample registration uses `/labs/samples/register`; old direct `PROCESSING` writes are gone. Unsupported sample stages and placeholder report uploads are removed/contained. Result review requires actual `structuredData`; hard-coded clinical output no longer appears as a patient result. |

## Verification

| Gate | Result |
|---|---|
| Focused labs service + lab-results workflow suites | **PASS** — 17 tests. |
| Full Backend regression suite | **PASS** — 55 suites, 341 tests. |
| Backend production build | **PASS** — `nest build`. |
| Provider release-contract suite | **PASS** — 1 suite, 12 tests. |
| Provider TypeScript check | **PASS** — `npx tsc --noEmit`. |
| Provider production Expo web export | **PASS**. |
| Archive integrity | **PASS** — rebuilt Backend and Provider archives validate with `unzip -tq`; dependencies and build outputs are excluded. |
| Backend archive SHA-256 | `933c43a3e1c906e8466e8d2f96f87d467d09331985f0e1523d678db434ee0cea` |
| Provider archive SHA-256 | `654413f43ac142b53e31b8bd4c74f86f2593a4c159f3511c0b992168c02fba8a` |
| Branch upload | **PASS** — source commit `7f6e811` (`fix: enforce lab lifecycle workflow`) is on `manus/on-live-reconciliation`. |

## Containment and remaining acceptance

The UI intentionally disables generic file upload and local draft claims until the existing private StorageObject binding is completed for lab reports. Likewise, sample rejection remains unavailable in this screen until the documented QC workflow is implemented server-side; it no longer pretends success through an unsupported route. The legacy alternate `labs-engine` controller and the unsupported QC endpoint are separate follow-up containment items. Phase 11 must run linked sandbox lifecycle tests covering provider ownership, `NEW_REQUEST` rejection, sample stages, result evidence/release, patient visibility, foreign-account denial, and notification delivery. No clinical result, sample, report, or production record was created or modified.
