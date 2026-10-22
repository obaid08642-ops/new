# Live gate: flaky journeys (2026-10-22, main 41ff7d471)

Two full runs of `tools/live/run_gate.sh` on a local stack (backend :8002, admin :3001, patient-web :3100).
Environment fixes (outside the repo): Playwright expected `chromium_headless_shell-1223`, which the image does not ship;
a wrapper at that path runs the installed Chromium 141. Without it 9 web journeys crashed at launch.

## Status

No journey code has been changed yet. This PR records the findings. The investigation is not finished.

## Journeys that differ between runs (candidates for flakiness)

| Journey | Run 1 | Run 2 | Cause | Fix |
|---|---|---|---|---|
| j_telehealth_consent | 5 failed | 1 failed | not yet identified | needs a third run and the failing step names |
| j_web_public_feed | green | 5 failed | feed shows no approved doctor (`20 items`, price and insurers `None`) | not yet identified |
| j_web_offers_waiting | green | 4 failed | offers page text differs from the expected "no pharmacy" line | not yet identified |
| j_web_call | green | 2 failed | no started video appointment | not yet identified |
| j_services_content | green | 4 failed | lab rows have content, radiology and nursing rows empty | not yet identified |

## Journeys that fail the same way in both runs (not flakiness)

| Journey | Cause | Kind |
|---|---|---|
| j_localized_name_english (9) | English name under ur/hi/bn names is `None` on the test DB | seed or data |
| j_insurance_selfpay_filters (5) | payment flags on test medicines do not match the expected cash/insurance split | seed or data |
| j_product_insurance_row (6) | `covered_by_insurance` is empty in product details | data |
| j_ai_scanner (11) | the AI provider is not running on this stack (503 `ai_provider_unavailable`) | environment |
| j_web_product_page (1) | `product-similar` resolves to 2 elements on the test product | open, see below |

## Environment blockers (not fixable in the repo)

- `Cannot connect to the Docker daemon` in the doctor-photo and doctor-profile steps.
- Site search reports engine `none` ("the site search finds the doctor").
- The photo object is not in the S3 bucket ("the photo object is in the bucket").

## Variant picker (reviewer report, run 39769485707)

Not reproduced here. `j_catalogue_variants` passed in both local runs (26/26). Probes of
`/en/p/<variant slug>` at 1280 and 390 px, sampled every 250 ms for 3 s after `load`, always
showed exactly one `data-testid="variant-picker"`. The server HTML contains one. The same product page
has one `product-equivalents` section in the server HTML. One sample on a non-variant product at 1280 px
briefly showed two equivalents sections, and a MutationObserver run did not reproduce it.

Conclusion so far: no evidence of a React duplicate. Cause not found. The page is not changed, and the
journey does not use `.first`.

## Open items

1. A third gate run, and per-step names for the four candidates above.
2. `product-similar` strict-mode error (j_web_product_page): find the test product that renders two
   similar sections, or show that the journey's locator is wrong.
