# Patient Web Public-Discovery Handoff — Nabd Plus

> **Purpose.** This document is the implementation contract for the patient-facing Next.js website when its source is added. It does not replace the website source or authorize a production deployment.

## 1. Public route contract

The public website must render the following entity route without requiring a patient session:

| Website route | Backend lookup | Canonical app link | Eligibility rule |
|---|---|---|---|
| `/s/:type/:slug` | `GET /seo/resolve/:type/:slug` | `nabdplus://s/:type/:slug` | Only records approved for public discovery |

Supported public `type` values are `medicine`, `doctor`, `facility`, `lab-service`, `home-care-service`, and `article`. The website must treat an unavailable or unapproved record as a real **404**, not as a soft public preview.

## 2. Rendering and metadata requirements

Each `/s/:type/:slug` page should be server-rendered or statically regenerated from the governed backend response. It must obtain metadata from `GET /seo/meta/:type/:slug`, emit a canonical URL using `NABD_PUBLIC_URL`, and preserve the Arabic-first response with language alternates only where a reviewed translation is available. It must not generate diagnosis, dosage, contraindication, price, availability, doctor credential, or insurance statements locally when the governed API does not supply them.

The website must consume the backend-generated structured payload rather than invent entity markup. A record with `public_eligibility !== true`, `medical_review_status !== "approved"`, or `indexing_eligibility !== true` must receive `noindex,nofollow` or be rendered as a 404 according to the entity endpoint result.

## 3. Discovery endpoints

| Artifact | Backend endpoint | Website responsibility |
|---|---|---|
| Sitemap | `GET /seo/sitemap.xml` | Expose or proxy only after a public domain is confirmed; do not add raw database rows. |
| Robots | `GET /seo/robots.txt` | Reference the public sitemap using the final verified domain. |
| AI overview | `GET /seo/llms.txt` | Publish unchanged as a supplemental discovery artifact; it is not an authority for patient-private data. |
| Share URL | `GET /seo/build/:type/:id` | Use only when the result is `ok: true`. |

## 4. Mobile continuity

The patient app accepts `nabdplus://s/:type/:slug` and supported HTTPS domains. The web domain must later serve both Android Digital Asset Links and the Apple App Site Association file for the final verified domains. Until those two files are hosted and verified, HTTPS links must remain safe browser links and cannot be claimed as verified universal links.

## 5. Release gate

Before indexing any patient-web entity page, the release owner must verify the final domain, configure `NABD_PUBLIC_URL`, host domain-association files, validate canonical/robots/sitemap behavior in staging, and run a crawl sample of approved and unapproved records. The site must not index the catalogue merely because a record exists in the operational database.

## 6. Out of scope until source delivery

The missing patient Next.js repository is required for page implementation, SSR/ISR selection, locale routing, analytics instrumentation, visual QA, and production build/deployment. This source was not present in the current main branch at the time of this handoff.
