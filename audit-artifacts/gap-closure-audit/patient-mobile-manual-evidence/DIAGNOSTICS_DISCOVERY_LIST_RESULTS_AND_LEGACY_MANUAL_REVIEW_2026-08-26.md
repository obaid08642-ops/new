# Patient Mobile: Diagnostics discovery, lists, results and legacy routes — manual semantic review

## Scope

| Source | Main reviewed behavior |
|---|---|
| `diagnostics/book-sample.tsx` | legacy home-sample wrapper |
| `diagnostics/booking-success.tsx` | post-submit outcome display |
| `diagnostics/lab-comparison.tsx` | single-test provider selection |
| `diagnostics/lab/[id].tsx` | lab profile and provider-locked service selection |
| `diagnostics/my-results.tsx` | unified results index |
| `diagnostics/orders.tsx` | unified booking list |
| `diagnostics/package-detail.tsx` | package details and add-to-cart |
| `diagnostics/packages.tsx` | package discovery/search/category list |
| `diagnostics/results-history.tsx` | lab result history |
| `diagnostics/sample-tracking.tsx` | legacy tracking redirect |
| `diagnostics/search.tsx` | service search |
| `diagnostics/technician-tracking.tsx` | legacy tracking redirect |
| `diagnostics/test-detail.tsx` | test/radiology service detail |
| `diagnostics/upload-rx.tsx` | legacy Rx redirect |

## Evidence-backed findings

| ID | Evidence | Finding | Required closure |
|---|---|---|---|
| PM-DX-010 | `test-detail.tsx:37–43, 117–160`; `package-detail.tsx:26–31, 84–145` | details are fetched from catalog, but fallback medical facts claim 24-hour result / 8-hour fasting / 10–12-hour fasting and `parseInt` client prices are added to cart | no medical preparation/turnaround fallback presented as fact; server quote and patient safety confirmation per selected service/provider/slot |
| PM-DX-011 | `lab/[id].tsx:102–123, 130–162` | lab profile invents marketing description if missing; an add uses `lockedProviderId` in local cart without proven service availability/quote, and cart membership condition can treat generic items as locked-provider items | provider profile must distinguish absent data; server owns locked selection and compatibility/price/slot decision |
| PM-DX-012 | `lab-comparison.tsx:31–86, 154–193` | comparison shows one base price from the generic service for every provider, then writes client price/provider/home flag to cart; it claims home fee is server-determined but does not request one | quote endpoint per provider/service/location/slot with final cash/insurance state; no client-held booking price |
| PM-DX-013 | `search.tsx:25–49, 93–122` | only labs are searched client-side, no radiology; card passes `testId` while `test-detail.tsx:20,37–43` reads `id`, producing a broken detail handoff | server search across lab/radiology and canonical `id` route with query validation |
| PM-DX-014 | `packages.tsx:26–45, 61–69, 169–247` | package search input has no bound state/filter; category comparisons mix localized category label with raw package category; broad `transparent` styles leave interface placeholder-like and potentially unreadable | working server/local filter with stable category IDs and fully defined theme tokens; no transparent placeholder UI |
| PM-DX-015 | `booking-success.tsx:20–96` | success animation, reference and amount are all derived from route params; no server-owned booking read verifies a terminal/request-created state | route only with booking ID, read authoritative state before success copy and show failure/pending/confirmation distinctly |
| PM-DX-016 | `orders.tsx:26–68, 199–215` | combined list reduces state vocabulary to a few lowercase values and every card opens `sample-tracking`, which is only a redirect to the list; order detail becomes unreachable from this primary list | normalized shared timeline and direct owned booking detail route; status mappings driven by state machine |
| PM-DX-017 | `my-results.tsx:23–42, 86–177`; `results-history.tsx:17–31, 61–105` | results screens merge incompatible lab booking/radiology report models locally, infer report readiness from URL/list shape, and ResultsHistory uses `report.id || item.id`; abnormal-result flag has no critical-result acknowledgement/escalation path | one protected results read model with report/study IDs, critical result policy/acknowledgment, and patient ownership enforcement |
| PM-DX-018 | `sample-tracking.tsx:1–6`; `technician-tracking.tsx:1–6` | both live tracking routes are honest redirects because a verified tracking payload is absent; this is still a missing capability for home service | real time-limited, order-scoped collector tracking/ETA/contact contract or remove CTA/marketed capability |
| PM-DX-019 | `book-sample.tsx:25–50` | this legacy entry is an honest wrapper and makes no booking/payment claim; however it routes into a cart that lacks the needed provider quote/slot flow | retain only as migration wrapper after the cart workflow is rebuilt |
| PM-DX-020 | `upload-rx.tsx:1–7` | diagnostics Rx upload redirects to Pharmacy prescription scanning, crossing clinical workflow and payer context | replace with diagnostics document upload or explicit shared document picker with typed purpose and scoped access |

## Conclusion

The remaining diagnostics screens confirm that failures are systemic rather than isolated: discovery and comparison present client-derived prices, primary order list navigation is broken, results merge unrelated data models locally, and home tracking is intentionally absent. The only honest wrappers/redirects must be retained as deprecated routes or replaced after a single authoritative diagnostics booking and results contract exists.
