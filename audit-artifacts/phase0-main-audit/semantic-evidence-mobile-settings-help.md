# Semantic evidence — Mobile Settings Help

Baseline: `22526bedb77a3d8148219036367e4714f401aecc`.

`audit-work/source/nabd_plus_patient_app/app/settings/help.tsx:39–47` reads `/support/faqs` and `/config`, but FAQ failures silently set an empty array and support-config failures silently leave `supportPhone` null. The screen cannot distinguish no FAQs from service failure and has no retry/refresh/stale state. Phone contact has no fallback or error message if config is absent or `Linking.openURL` fails (`:68–104`).

FAQ categories are hard-coded Arabic labels/icons (`:18–25,107–128`) and filter local loaded data using exact category equality (`:49`); server category taxonomy, localization, pagination, effective dates and content versioning are not proven. FAQ entries are rendered through raw `q/question` and `a/answer` fields with list index keys (`:130–155`), no schema/sanitization/source attribution, content safety or medical disclaimer. Missing fields can render blank content.

Contact options route chat/email to `/settings/support-chat` and `/settings/feedback`, while direct call uses a configured phone (`:68–105`); there is no auth/guest policy, ticket linkage, SLA contract, callback tracking, privacy handling or escalation state. The “support available 24/7” copy is hard-coded (`:158–176`) and not backed by schedule/status. All visible copy is Arabic with no localization branch. No Phase 0 remediation was made.
