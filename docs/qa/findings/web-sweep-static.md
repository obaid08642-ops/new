# QA sweep: patient-web static routes, anonymous (390 and 1280 px)

Source: `/tmp/claude-0-scratch/sweep_static.jsonl` (sweep script, route list from the file tree). 119 of 141 static routes recorded when the local stack went down; the rest are not yet swept.

Anonymous sweep: auth-gated pages redirect to /en/login?next=... This is correct behaviour and is NOT a finding. They need a signed-in sweep, not done yet.

| severity | route | element | steps | expected | actual | file:line |
|---|---|---|---|---|---|---|
| P2 | /diagnostics/radiology, /diagnostics/labs, /labs | lab and radiology images | Open the page at 390 and 1280 | Images load | 404 from the image proxy: `https://cdn.nabd.plus/radiology/hsg.png`, `barium.png`, `labs/semen.png`, `pap.png`, `hiv.png` (server log: "upstream image response failed"). Broken images on the page | patient-web image source (not located yet) |
| P2 | /medicine, /medicine-catalog, /medicines, /pharmacy/filters | pharmacy orders call | Open signed out | No authenticated call for an anonymous visitor | `401 GET /api/patient/patient/pharmacy/orders` plus console error (known, still open on main) | patient-web/components-next/orders/orders-screen.tsx:52 is not confirmed as the caller |
| P2 | /consultations/doctors, /consultations/specialties, /consultations/doctor-profile | external resource | Open signed out | No console errors | `Failed to load resource: net::ERR_SSL_PROTOCOL_ERROR` on one external host (sandbox proxy, not yet identified) | not yet identified |
| P3 | /diagnostics | controls without an accessible name | Open the page | Every control has a name | 10 visible controls with no label | patient-web diagnostics page (not yet located) |
| P3 | /diagnostics/labs/book | route without a query | Open the page with no serviceId | Clear message or redirect | HTTP 404. The page calls notFound() when there is no serviceId (by design). Check that no link points here without the id | patient-web/app/[locale]/diagnostics/labs/book/page.tsx:11 |

Legal pages (/en/privacy, /en/terms, /en/refund-policy): 404 on the LOCAL stack only. The backend returns 200 with an empty body for GET /legal/policy/<key>, because the test database has no published text. Production returns 200 for all three (read-only GET). So this is a test-data gap, not a product defect. Not logged as a finding.
