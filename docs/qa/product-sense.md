# Product-sense sweep: patient web at 390 width (ar and en)

Walked on 2026-10-28. Public pages on production (`https://nabd.plus`, GET navigations only, no sign-in). Signed-in pages and the cart and checkout on the local stack with a test account (test data by design: names, emails and "اختبار" entries are the test account's data, not product issues, and are not listed). Load times are one cold run each (`load` event). Screenshots were taken for review and are not committed.

One line per issue: screen | problem | why it matters | fix.

| Screen | Problem | Why it matters | Fix |
|---|---|---|---|
| Map (ar, en) | Test and junk providers are on the public map: "لنبتبت", "مسينيزيزسزس اال", "د. اختبار ساندبوكس الرياض" (ar); "Sandbox Doctor Riyadh", "Reee riyadh", "sudden riyadh" (en). | Patients see fake facilities as real; a booking on one is a real problem. This is the most serious finding here. | Unpublish the sandbox and junk providers on production; block test-name patterns from public approval. |
| Map (ar) | City shown in English: "riyadh" on each card. | Mixed language on the Arabic page. | Localise the city or take it from the Arabic city name. |
| Consultations, specialties (ar, en) | Every specialty shows "0 doctors available" (e.g. "طب عام 0 طبيب متاح"). | Dead end: the patient cannot act on any specialty; the list looks broken. | Show only specialties with a doctor, or show a next step ("ابحث عن طبيب في تخصص قريب" / a waitlist). |
| Medicine catalogue (ar: `/medicine-catalog`, `/pharmacies`) | "Panadol Blue Tablets" card has only an English product name. | Mixed language on the Arabic page; "Blue Tablets" looks like a test product. | Check whether the product is test data; if real, add the Arabic name. |
| Medicine catalogue (en) | Arabic form word "جل" (gel) on the card "Dentu, Mouth Gel, For Ulcers … جل · 20 ml". | Mixed language on the English page. | Translate the form name in the English view. |
| Cart (ar) | Product line "… tablet · 500mg" in English inside the Arabic cart. | Form and strength are not localised in Arabic. | Localise form and strength (تابلت, 500 ملغ) in the Arabic cart and checkout. |
| Home (ar) | Load 1.6 s on a cold first load. | Over the 1 s target on the first screen. | Check the home page's blocking requests and above-the-fold images. |
| Labs (ar) | Load 1.2 s; diagnostics 1.06 s; nursing 0.87 s (cold). | The lab and diagnostics lists are the slowest screens after home. | Paginate or virtualise the lists; defer the price and coverage loads. |
| Pending catalogue rows (API) | The public catalogue API returns pending and legacy rows (see `docs/qa/catalogue-review.md`). On the labs and radiology pages walked here, no duplicate service names were visible, so the pages seem to hide them; that was not checked for every page. | Any page or client that reads the API directly would show the duplicates. | Filter pending and null rows in the API for public routes. |
| Checkout (ar, en) | Clear flow: request, delivery or pick-up, payment method, "Nothing is charged when you send the request", cancellation policy link. | Good; no fix. | None. |
| Cart, empty (ar, en) | Empty state gives two next steps (browse medicines, upload a prescription). | Good; no fix. | None. |
| Cart, with item (ar, en) | "No prices in the cart: the prices come with the pharmacies' offers." | Good: the price logic is explained where it applies. | None. |

Test data seen on the local stack (not product issues, listed so they are not mistaken for product bugs): the test account's name and email on the dashboard and profile; "قيمة اختبار" (test value) as a doctor name, city and facility; the QA tag at the end of medicine names (for example "b4de0e").

Not covered by this sweep: the provider apps, the admin, the checkout's card payment page, and any screen that needs a real insurance policy or a live pharmacy offer.
