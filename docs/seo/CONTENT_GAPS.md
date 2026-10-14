# SEO content gaps (not filled: nothing medical is invented or machine-translated)

Owner request 2026-10-12: every public type has a real page in ar, en, ur, hi, bn and fil. The page
chrome, titles, descriptions, direct answers and structured-data labels are translated in all six
(patient-web/messages, `SeoAnswer` namespace). The entity's own content is shown as the catalogue
holds it. These gaps need the content or translation team, not code:

| Type | What exists | Missing | Where it shows |
|---|---|---|---|
| Medicines | name, category, ingredient, form, strength per locale for part of the catalogue | translations per locale: see `docs/seo/MEDICINE_REPORT.md` (`GET /api/v1/admin/seo/medicine-report`) | a missing localized slug falls back to the shared slug; a missing localized field falls back per the existing locale rule |
| Health articles | `title_ar`, `title_en`, `excerpt_ar`, `excerpt_en` | ur, hi, bn, fil text | /ur, /hi, /bn, /fil article pages show the English text; JSON-LD `inLanguage` says the text's language |
| Conditions | `name_ar/en`, `overview_ar/en` | ur, hi, bn, fil | same as articles |
| Doctors, facilities, pharmacies | `name_ar`, `name_en`, specialty code, city | names in ur, hi, bn, fil (names are usually kept as written) | pages show the English name outside Arabic |
| Lab and radiology services | `name_ar/en`, `description_ar/en` | ur, hi, bn, fil descriptions | the page shows the English text |

## Needs review (backend / product)

- `patient-web/app/[locale]/labs/[testSlug]/[citySlug]/page.tsx`: the "partners" list is every public
  facility in the city (`/entity-graph/explore?city=`), not the labs that offer the test. The page now
  exists only for a real test from the lab catalogue, but the list should come from labs that offer
  it (backend: no test → lab relation is exposed publicly today).
- `patient-web/app/[locale]/radiology/[serviceSlug]/[citySlug]/page.tsx`: the list does not depend on the
  city; these pages now point (canonical) at `/diagnostics/radiology/{id}` and are not indexed.
- `backend/src/modules/admin/enterprise/admin-cms.controller.ts` "Schedule a future publish — the cron
  flips it when due": no such cron exists for articles (only notification campaigns have one).
