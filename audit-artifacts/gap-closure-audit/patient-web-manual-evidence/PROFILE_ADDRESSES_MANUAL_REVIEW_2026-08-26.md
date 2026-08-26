# Patient Web: Profile and addresses — manual source review

The current Web profile page is a protected **read** surface. It fetches profile, medical profile, and insurance, renders selected fields, and offers navigation links; there is no form/mutation CTA for profile, medical profile, address, or insurance updates in `app/[locale]/profile/page.tsx:27–58`.

| Mobile row | Web evidence | Classification | Finding |
|---|---|---|---|
| PM-207 profile addresses | No `app/[locale]/addresses` route and no address CTA/mutation on profile; profile quick actions omit addresses at `profile/page.tsx:42–52`. | `MISSING_CAPABILITY` | No address list/add/edit/delete/default/geolocation/privacy workflow is evidenced. |
| PM-208 profile edit | Profile only renders `<dl>` display fields at `profile/page.tsx:53–58`; no edit form/handler is present. | `MISSING_CAPABILITY` | No patient profile/medical profile update validation, consent, audit, error/retry, or ownership workflow is evidenced. |
| PM-209 profile index | `/{locale}/profile` reads `/users/me/profile`, `/medical-profile`, and `/users/me/insurance` at lines 27–39. | `STATIC_MATCHED_PARTIAL` | A protected display equivalent exists, but source does not prove field-level ownership/freshness and it lacks management controls. |
| PM-210 profile insurance | The profile renders only selected provider/company/status fields at lines 35–39; broader Web insurance is a read-only summary per `insurance/page.tsx:19–38`. | `MISSING_CAPABILITY` | No policy selection/update/benefits/coverage/co-pay action or payer decision is evidenced. |

No runtime, Backend, user-data, or permission claim is made from this source-only review.
