# Patient Web: Mental-health intervention surfaces — manual source review

The Web provides protected **history/contact reads** only: breathing history (`mental-health/breathing/page.tsx:12`), meditation history (`mental-health/meditation/page.tsx:12`), and crisis-contact cards (`mental-health/crisis-contacts/page.tsx:12`). None has a start/session, entry, call, escalation, therapist, self-assessment, or safety-plan action CTA.

| Mobile row(s) | Classification | Source-bounded disposition |
|---|---|---|
| PM-152 breathing | `STATIC_MATCHED_PARTIAL` | Protected breathing-session history exists; no start/live guidance/streak/entry or clinical escalation CTA. |
| PM-156 meditation | `STATIC_MATCHED_PARTIAL` | Protected meditation history exists; no start/program/prescription/feedback or intervention CTA. |
| PM-153 crisis support | `MISSING_CAPABILITY` | Crisis contacts are masked text cards, without call/SOS/geolocation/handoff/confirmation/safety workflow. |
| PM-157 mood journal; PM-158 self-assessment; PM-159 therapist match | `MISSING_CAPABILITY` | No mood entry, screening/scoring consent, care referral, provider matching, booking, adverse response or clinical escalation surface. |

No clinical safety, response time, provider availability, consent, ownership or runtime communication claim is made from source-only evidence.
