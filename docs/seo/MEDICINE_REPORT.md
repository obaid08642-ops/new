# Medicine SEO report

Owner request 2026-10-12: how many medicines are approved for publication, and how many are
missing a translation in a public locale (ar, en, ur, hi, bn, fil). Nothing is invented: a gap is
counted and listed by medicine id for the medical and translation teams, never filled.

## Definitions (same filter as the public product pages)

| Term | Filter on `medicines` |
|---|---|
| Approved for publication | `is_deleted != true`, `public_eligibility = true`, `medical_review_status = 'approved'` |
| Indexable | the above plus `indexing_eligibility = true` (sitemaps, IndexNow, llms) |
| Missing translation in a locale | `missingPublicMedicineTranslations` (`backend/src/modules/medicines/med-i18n.ts`): the name, plus category, active ingredient, dosage form and strength when the source has them; and the localized URL slug `translations.<db>.slug` (`fil` is stored as `tl`) |

## How to get the numbers

- Admin API: `GET /api/v1/admin/seo/medicine-report` (JSON with sample ids per locale) or
  `?format=markdown`.
- CLI (read-only): `cd backend && MONGO_URL=... DB_NAME=... npx ts-node -T scripts/seo-medicine-report.ts --json report.json --md report.md`

## Numbers

Not filled in by the SEO session: that session had no access to the production or staging
database, so it could not read the catalogue. The reviewer or owner runs one of the two commands
above and pastes the table here. The report is covered by
`backend/src/modules/seo-search/medicine-publication-report.spec.ts` (seeded counts per locale).
