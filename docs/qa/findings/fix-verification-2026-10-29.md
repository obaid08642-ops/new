# Verification of the 2026-10-29 fixes on main (local stack, 2026-10-29)

Stack: the local services were rebuilt from `origin/main` at 9a291681d (backend `nest build`, patient website and admin `next build`) and restarted. The journeys ran from a worktree of `qa/e2e-sweep` (the journeys are on that branch only). Production was not touched: GET only, and the production deploy has not happened yet.

| PR | Fix | Status | Evidence |
|---|---|---|---|
| #2085 | refund cap (REF-PEN-1) | FIXED | `tools/live/j_qa_refund_penalty.py` 40/40 on main (was 39/40): the late-cancel refund equals the cancellation percentage. |
| #2086 | copay cap (INS-CAP-1) | FIXED | `tools/live/j_qa_copay_cap.py` 39/39 on main (was 37/39): the copay is the 500 SAR cap, not 70 % of the price. |
| #2087 | provider services filters | FIXED | `tools/live/j_provider_service_options.py` on main, 120/129 (was 117/129): the home and insurance filter steps now pass. |
| #2088 | provider options (own price, insurance, comparison) | PARTIAL | Same journey: still failing — each lab shows the catalogue price (110, not 95/130), the price comparisons are empty, the nurse list shows the catalogue price (100), and there is no insurance flag on the nurse row. Findings: `docs/qa/findings/provider-services.md` gaps 1, 2, 3, 6, 7, 8. |
| #2089 | diagnostics list (CAT-1) | MOSTLY FIXED | The list is paged: `/en/diagnostics` shows 19 labs on the first page and reaches 71 of 77 approved labs across its `?more=` pages on main. The 12 packages have their own view. The other 6 are not identified yet (not confirmed as packages). Button-based checks did not work: the control is a link. |
| #2090 | web booking with a duration (PS-P0-2) | FIXED | `tools/live/j_web_qa_map_book.py` 43/43 on main, with no workaround (the duration field is sent and accepted); before, the booking returned 400 `invalid_appointment_payload`. |
| #2091 | removal of the 8 approved test providers (PS-P0-1) | NOT VERIFIED | The removal is a guarded ops run; it is not yet on production (no deploy). Re-check the public map with GET after the deploy. |
| #2092 | guest insurer list | FIXED | `GET /api/v1/insurance/companies` without a token answers 200 with 45 insurers on main (was 403 for guests). The add-policy page itself was not walked. |
| #2093 | no internal fields in the public catalogue | FIXED | `GET /api/v1/catalogs/{labs,radiology,nursing}` on main: none of `_id`, `__v`, `is_deleted`, `deleted_at`, `*_by`, `machine_*` appears (createdAt, updatedAt and version are kept on purpose). |
| #2094 | duplicate catalogue services (CAT-4) | FIXED ON LOCAL | No duplicate English names in the local labs (77), radiology (34) or nursing (33) catalogues. Production has not had the merge applied from here (ops run, not verified). |

Open after this check: #2088 (the provider price and insurance display); #2089 (6 labs not reached); #2091 (production check after the deploy); #2094 (production check after the apply). Step 3 of the lead's list (every price a patient sees against the checkout price, including insurance and copay) is not done yet.
