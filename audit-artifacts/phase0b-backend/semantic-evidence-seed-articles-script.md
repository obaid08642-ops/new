# Phase 0B semantic evidence — Seed articles script

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `scripts/seed-articles.ts:1–61`

The script is marked `@ts-nocheck`, is intended to seed three starter health articles and advertises that they are published for the public hub; it is runnable directly through `npx ts-node` (`1–5`). It selects `process.env.MONGO_URI` with a localhost `mongodb://localhost:27017/nabdah` fallback (`7–9`) and has no environment/database identity gate, production denial, operator authorization, dry-run or provenance/approval requirement.

The article catalog is hardcoded as three records with slugs, Arabic/English titles, Arabic excerpts/body, categories, tags and a generic author identity/title (`11–45`). The content includes prevention, nutrition and diabetes claims/advice, including numeric prevalence and screening recommendations (`13–43`), but no citation/source, clinical reviewer identity, medical approval/version, disclaimer, evidence date or content expiry. English metadata has no English excerpt/body, and the records include no image, canonical URL, locale/version, structured data, category hierarchy or internal-link contract (`11–45`). The script therefore seeds only a small fixed catalog and cannot substantiate complete or current SEO/medical truth.

Each record is upserted by slug and unconditionally set to `status: 'PUBLISHED'`, current `published_at`, and `is_deleted: false`; IDs/views/createdAt are initialized only on insert (`47–58`). There is no unique-index/reconciliation assertion, publication approval, update version, edit audit, retirement/410 lifecycle, content validation, slug collision policy, per-locale completeness, medical moderation or sitemap/indexing gate. The script has no coupling to author credentials or article workflow. `mongoose.disconnect()` occurs only after success and the catch logs then exits without guaranteed cleanup (`47–61`). The script was not executed; no product code was changed and no tests/builds were run during this semantic read.
