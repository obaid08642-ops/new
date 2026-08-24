# Semantic evidence — Mobile Search

Baseline: `22526bedb77a3d8148219036367e4714f401aecc`.

`audit-work/source/nabd_plus_patient_app/app/search/index.tsx:31–63` persists recent search terms in unencrypted AsyncStorage under a static key and issues `/home/search?q=...` after a 500 ms debounce. The request has no AbortController/request sequencing, loading state, error state, empty/no-result state, timeout or retry UI; an older response can overwrite a newer query and failures are sent only to `console.error` (`:48–63`). Recent-search parsing is not guarded against malformed JSON (`:31–35`).

Category mappings are hard-coded and depend on server `type`/`typeEn` strings (`:14–18,65–74`). Results are reordered locally so sponsored entries appear first (`:76–77`) without an explicit sponsored disclosure policy, provenance, ranking contract or safety rule. Result display uses server fields directly, including names, descriptions, rates and prices, with no schema/price freshness/locale or currency validation (`:160–215`).

Result navigation validates only a truthy ID (`:79–103`). Doctors, medicines, labs/radiology, articles, community and family use different hard-coded routes; packages fall back to Health; insurance ignores the result ID; radiology shares a generic test-detail route; and route params/identifier ownership are not validated. Unknown result types become non-actionable cards rather than an explicit unsupported state.

Search stores potentially sensitive query terms locally without retention/clear/export policy and has no accessible clear/search-submit/mic behavior beyond a decorative mic icon (`:105–118`). No Phase 0 remediation was made.
