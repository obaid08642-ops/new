# Catalogue and entry points: P0 / P1 / P2 findings (2026-10-29)

Checked on production by GET only (`https://nabd.plus`, `https://api.nabd.plus/api/v1/catalogs/*`). No write, no load test. Where a finding was reproduced on the local stack instead, it says so.

## P0

None in this area. (The map test-data finding is in `product-sense.md`.)

## P1

| ID | Finding | Evidence | Fix |
|---|---|---|---|
| CAT-1 | `/diagnostics` shows 21 of the 120 public lab tests and has no control to load the rest. `/labs` shows all of them (121 linked ids against 120 public, none missing). | Production, 2026-10-29: `https://nabd.plus/en/diagnostics` links to 21 `/labs/<id>`; `https://nabd.plus/en/labs` links to 121. API: `GET https://api.nabd.plus/api/v1/catalogs/labs`, 120 with `medical_review_status: approved`, active, not deleted. The cause (a default filter or a limit) was not found; the "Where: Home scan" field did not open for automation. | Make `/diagnostics` show the same lab list as `/labs`, or say on the page which subset it shows and why. |
| CAT-2 | Lab, radiology and nursing items carry no `name_ur`, `name_hi`, `name_bn` or `name_tl` on any row (48 radiology, 152 labs, 77 nursing). | `docs/qa/catalogue-review.md`, cross-cutting section. Breaks the owner's six-language translation rule. | Add the four languages to every catalogue row, from the review list. |
| CAT-3 | Nursing catalogue: 24 rows have binary bytes in the `code` field (not text). Each duplicates a readable row by name. | `docs/qa/catalogue-review.md` (nursing section), `GET https://api.nabd.plus/api/v1/catalogs/nursing`. | Delete the binary rows after checking no booking references them. |
| CAT-4 | Lab, radiology and nursing catalogues contain the same service under two to four codes, with different prices. | `docs/qa/catalogue-review.md`. Example: CBC is 35, 45 and 80 across three codes. | Keep one approved row per service and one price. |
| PS-1 | The labs and nursing entry points show a catalogue price for every provider, not the provider's own price. | `docs/qa/findings/provider-services.md`, gaps 1, 2, 7. Local reproduction 2026-10-28: both labs show 110, the nurses show 100. | Read the per-provider price from the record the provider sets (see that file for the two sources). |

## P2

| ID | Finding | Evidence | Fix |
|---|---|---|---|
| CAT-5 | An item with no provider shows "No lab can run this test right now." and no action. There is no "notify me" control on lab, radiology or nursing pages. The only "notify" value in the code is the pharmacy `notify_me` alternative (`backend/src/modules/ordering/ordering.service.ts:329`). | `patient-web/components-next/diagnostics-cart-client.tsx:152` (message); `patient-web/messages/en.json` key `DiagWeb/noProviderBody`. Production: no notify control on `/labs`, `/diagnostics`, `/radiology`, `/nursing/catalog`, in ar or en. | Add a "notify me" action on the no-provider state, with a backend route to store the request. |
| CAT-6 | The public catalogue API returns pending and legacy rows (`medical_review_status` `pending` or `null`). The pages walked hide them; any client that reads the API directly does not. | Radiology 26, labs 32, nursing 41 such rows, from `GET https://api.nabd.plus/api/v1/catalogs/*`. | Filter pending and null rows in the public route. |
| CAT-7 | Wrong categories and names: PSA and CA-125 and AFP filed under "hormones" or "infection" instead of tumour markers; ferritin's Arabic name "حديد Ferritin" (iron, not ferritin); "Testosterone" in two categories. | `docs/qa/catalogue-review.md`, labs section. | Fix the category and the Arabic name on the listed codes. |
