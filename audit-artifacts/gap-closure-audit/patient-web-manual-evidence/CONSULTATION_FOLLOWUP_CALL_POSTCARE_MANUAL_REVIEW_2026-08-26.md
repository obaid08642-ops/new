# Patient Web: Consultation follow-up, call and post-care — manual source review

The current localized consultation route tree contains only public doctor discovery/detail and specialty discovery. `consultations/doctors/page.tsx:10–18` supports public search, specialty query and rating/price/wait sort and links to doctor detail. It does not implement a follow-up, clinic, home-visit tracking, call-history, incoming-call, waiting-room, rating, prescription, report-share, summary or video-room page.

| Mobile row(s) | Web evidence | Classification | Source-bounded disposition |
|---|---|---|---|
| PM-046 doctor search | `/{locale}/consultations/doctors`; `consultations/doctors/page.tsx:10–18` | `STATIC_MATCHED_PARTIAL` | Search/sort/detail handoff exists, but price/availability/insurance authority and full booking state are unresolved. |
| PM-039 call history; PM-050 incoming call; PM-058 video detail; PM-059 virtual waiting room; PM-060 waiting room | No corresponding localized page exists; call-token surface already reviewed is local token-ready only. | `MISSING_CAPABILITY` | No Web call history, room join, media permissions, provider presence, waiting state, escalation, audit or end-of-call workflow is evidenced. |
| PM-042 clinic confirmation; PM-043 clinic location; PM-044 clinic detail; PM-049 home-visit tracking; PM-051 offer detail | No clinic/home-visit/offer route exists in Web consultation tree. | `MISSING_CAPABILITY` | No provider/location/slot/price/insurance/payment/fulfillment state or tracking surface is evidenced. |
| PM-048 follow-up; PM-052 post-call rating; PM-053 prescription-from-doctor; PM-054 share report; PM-056 consultation summary | No corresponding consultation post-care route/CTA exists. | `MISSING_CAPABILITY` | No follow-up eligibility, rating submission/moderation, prescription ownership, report consent/share/revocation, clinical summary or notification workflow is evidenced. |

No runtime call, provider behavior, backend authorization, clinical content, payment or PHI sharing claim is made from this source-only review.
