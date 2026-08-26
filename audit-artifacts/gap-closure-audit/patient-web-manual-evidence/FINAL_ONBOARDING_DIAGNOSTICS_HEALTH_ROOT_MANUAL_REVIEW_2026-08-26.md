# Patient Web: Final onboarding, root, diagnostics and health mappings — manual source review

This final Web-review wave is source-only. It maps only the rows below and does not establish upstream ownership, clinical authority, payment, consent, data freshness, or runtime behavior.

| Mobile rows | Web evidence | Classification | Source-bounded disposition |
|---|---|---|---|
| PM-010 onboarding index; PM-125 root index | `/{locale}` landing at `app/[locale]/page.tsx:10–11` links only login and medicine catalog. | `STATIC_MATCHED_PARTIAL` | Public landing exists, not a Mobile onboarding state machine or authenticated home. |
| PM-011 onboarding language; PM-012 onboarding permissions | No localized onboarding language/permission screen/CTA. | `MISSING_CAPABILITY` | No language-persistence or consent/permission request/revocation flow. |
| PM-016 tabs home | `/{locale}/dashboard`; `dashboard/page.tsx:45–75`. | `STATIC_MATCHED_PARTIAL` | Protected navigation hub exists; it is not evidence for all tab/dashboard data states or Mobile aggregate behavior. |
| PM-019 tabs services | Dashboard links fixed known destinations but no services-directory route/CTA is present. | `MISSING_CAPABILITY` | No general services discovery/selection journey. |
| PM-029 article bookmarks | `/{locale}/articles/bookmarks`; `articles/bookmarks/page.tsx:12`. | `STATIC_MATCHED_PARTIAL` | Protected bookmarked-list/detail handoff exists, but no add/remove/note/share CTA. |
| PM-069 lab comparison | No comparison route/CTA found. | `MISSING_CAPABILITY` | No provider/price/ETA/insurance comparison or selection workflow. |
| PM-071 my results; PM-073 diagnostic orders; PM-076 results history | `/{locale}/diagnostics`; `diagnostics/page.tsx:19–47`. | `STATIC_MATCHED_PARTIAL` | Protected booking dashboard renders state/schedule and report-ready badge only; no report content/download/history/order action. |
| PM-074 package detail | `/{locale}/diagnostics/packages/{packageId}`; `diagnostics/packages/[packageId]/page.tsx:12–40`. | `STATIC_MATCHED_PARTIAL` | Public catalog facts/preparation exist; no booking, insurance, payment or confirmation CTA. |
| PM-099 actionable order; PM-103 conditions/allergies; PM-110 health ID; PM-120 smart reminders | No corresponding localized health route/CTA found. | `MISSING_CAPABILITY` | No action/condition-allergy/health-ID/smart-reminder management workflow. |
| PM-104 health edit profile | `/{locale}/profile` is display-only under prior evidence; no edit CTA/mutation. | `MISSING_CAPABILITY` | No health-profile update/validation/consent/audit workflow. |
| PM-113 medications | `health/chronic-medications/page.tsx:12` displays chronic medication facts only. | `STATIC_MATCHED_PARTIAL` | Read-only medication subset exists; no full medication management or prescribing/refill action. |
| PM-114 prescriptions | `/{locale}/prescriptions`; `prescriptions/page.tsx:13–43`. | `STATIC_MATCHED_PARTIAL` | Protected prescription summaries exist; cards are not links and no detail/refill/share/pharmacy handoff CTA. |
| PM-160 notifications index | `/{locale}/notifications`; `notifications/page.tsx:14–25`. | `STATIC_MATCHED_PARTIAL` | Protected inbox and settings link exist; no mark-read/delete/deep-link/per-notification action. |

No claim is made that source inventory closure proves parity, production readiness, backend reconciliation, or remediation authority.
