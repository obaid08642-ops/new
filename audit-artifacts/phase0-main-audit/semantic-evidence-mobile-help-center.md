# Semantic evidence — Mobile Help Center

Baseline: `22526bedb77a3d8148219036367e4714f401aecc`.

`audit-work/source/nabd_plus_patient_app/app/settings/help.tsx:39–47` loads `/support/faqs` and `/config`, but any FAQ failure becomes an empty array and config failure is silently ignored. The screen therefore cannot distinguish unavailable help content from no FAQs and cannot prove freshness, locale completeness, or config schema. FAQ keys use array indexes and render either `q/question` and `a/answer` without validation (`:130–154`).

Contact actions route chat to `/settings/support-chat`, route email to `/settings/feedback`, and open `tel:${supportPhone}` when configured (`:68–104`). The source provides no URL/phone validation, confirmation, auth/guest policy, support-ticket correlation, PHI warning, or error/retry state. The support-chat destination is only a redirect wrapper per `semantic-evidence-mobile-settings-support-chat.md`.

FAQ categories are hard-coded (`:18–25`) and filtering compares a local Arabic label to a server `category` value (`:107–127,49`), with no typed category mapping. The page advertises “support available 24/7” (`:158–176`) without an operating-hours/source contract. There is no clear search, pagination, article deep-link, accessibility semantics or analytics/audit evidence. No Phase 0 remediation was made.
