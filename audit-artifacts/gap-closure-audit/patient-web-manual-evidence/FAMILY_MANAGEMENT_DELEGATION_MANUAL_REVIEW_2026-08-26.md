# Patient Web: Family management and delegation — manual source review

`app/[locale]/family/page.tsx:15–44` is a protected read surface. It fetches family members and an optional group, then renders group name/count and member display name/role/relation/joined date as `<article>` cards. The page has no links, buttons, mutation handler, invitation, member-detail, consent/delegation, health-data or chat CTA; the only action-related component is an error-state retry.

| Mobile row | Web evidence | Classification | Source-bounded disposition |
|---|---|---|---|
| PM-088 family chat; PM-107 health family chat | No family-chat Web route/CTA found; family list has no link/action. | `MISSING_CAPABILITY` | No compose/thread/provider routing/consent/PHI guard/escalation workflow is evidenced. |
| PM-094 family member health; PM-109 health family member detail | Family cards at `family/page.tsx:35–42` are not links and display no health detail. | `MISSING_CAPABILITY` | No delegated health-view scope, patient/member authorization, audit/revocation, or member-detail screen is evidenced. |
| PM-100 health add-family-member | No invitation/add-member form or mutation is present; `family/page.tsx:15–44` is list-only. | `MISSING_CAPABILITY` | No invite/accept/reject/role/consent/age guardian workflow is evidenced. |
| PM-106 health family calendar; PM-108 health family hub | `/{locale}/family` shows membership summary only. | `MISSING_CAPABILITY` | No calendar, care coordination, appointment delegation or family action path is evidenced. |

No Backend/ownership/runtime conclusion follows from page redirects or protected GETs alone.
