# QA sweep: patient-web dynamic routes (IDs from the seeded data), production layout

Seeded doctor: id `c555d9cd-f741-469a-9902-8a99c6dd4da6`, slug `qyma-akhtbar-c555d9`. Of the 53 dynamic routes, only these were filled with real IDs so far. The rest need seeded IDs for articles, facilities, community posts, orders, appointments, labs, radiology services, packages, results and clinics (not yet seeded or not yet listed), so they are NOT TESTED.

| severity | route | element | steps | expected | actual | file:line |
|---|---|---|---|---|---|---|
| P1 | /en/consultations/doctors/c555d9cd-f741-469a-9902-8a99c6dd4da6 | whole page (booking screen by doctor id) | Open the page at 390 or 1280 | The doctor's booking screen | HTTP 503 "We can't load this page right now" in about 0.13 s. The backend returns 200 for the same doctor (GET /care/doctors/:id). Next server log, repeated: `Error: Functions cannot be passed directly to Client Components unless you explicitly expose it by marking it with "use server"`. The server component passes a function value to a client component. Exact prop not yet isolated | patient-web/app/[locale]/consultations/doctors/[doctorId]/page.tsx:96 (ProfileHeader and the surrounding ConsultPage); the same error is logged on this route only |
| OK | /en/doctor/qyma-akhtbar-c555d9 | doctor profile by slug | Open the page | Renders | Renders, not flagged | - |
| OK | /en/consultations/book/<id> | book (signed out) | Open the page signed out | Redirect to login | Redirects to /en/login?next=… | - |
| P3 | /en/consultations/doctor-profile | route | Open with no id | Redirect or clear message | Redirects to /en/consultations/doctors (by design, as the page redirects) | - |
