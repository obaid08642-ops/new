# Patient Web: AI, emergency, wallet, loyalty and returns — manual source review

The localized Web route tree has no AI, emergency/SOS, wallet, loyalty or returns pages. A source scan found no corresponding feature code or CTA; isolated health emergency-contact summary and generic account/session code are not equivalent evidence for these journeys.

| Mobile rows | Classification | Source-bounded gap |
|---|---|---|
| PM-021–PM-027 AI chat/report/translator/skin/symptom/triage | `MISSING_CAPABILITY` | No Web AI interaction, prompt/data consent, grounding/citation, medical safety/disclaimer, escalation, export or retention surface is present. |
| PM-083–PM-086 emergency/SOS/tracking | `MISSING_CAPABILITY` | No SOS trigger, location permission, dispatch, live tracking, emergency contact call, acknowledgement or fail-safe surface is present. The read-only emergency contacts page does not implement emergency response. |
| PM-139–PM-143 loyalty | `MISSING_CAPABILITY` | No points, challenge, reward, referral or leaderboard surface, ledger, eligibility or abuse-control workflow is present. |
| PM-217–PM-219 returns | `MISSING_CAPABILITY` | No return request/detail/approval/refund/fulfillment workflow is present. |
| PM-241–PM-245 wallet | `MISSING_CAPABILITY` | No wallet/card/top-up/transfer/transaction UI, ledger, payment instrument, authorization, limits, receipt, dispute or reconciliation workflow is present. |

No conclusion is made about any backend API or live financial/emergency/AI behavior.
