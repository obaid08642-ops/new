# Patient Web: Settings, privacy, security and data — manual source review

`app/[locale]/settings/page.tsx:12–44` performs protected reads for privacy settings, security settings, storage and sessions. It renders booleans/summary values in cards and ends with an explicit `readOnlyBoundary`. A source scan found no settings mutation route or client control; `lib/api/settings-server.ts:4–16` exposes GET wrappers only.

| Mobile row | Web evidence | Classification | Source-bounded disposition |
|---|---|---|---|
| PM-229 settings index | `/{locale}/settings`; `settings/page.tsx:12–44` | `STATIC_MATCHED_PARTIAL` | Protected read summary exists with unauth/error branches, but no management CTAs. |
| PM-226 settings data | Storage summary at `settings/page.tsx:18–43`. | `MISSING_CAPABILITY` | No data export/download/delete/retention/consent/retry/audit workflow is evidenced. |
| PM-233 settings privacy | Privacy boolean display at lines 18–43 and no source mutation route. | `MISSING_CAPABILITY` | No update/revocation/consent scope/field-level privacy/audit workflow is evidenced. |
| PM-234 settings security | Security and session summaries at lines 18–43 and no source mutation route. | `MISSING_CAPABILITY` | No 2FA/biometric control, session revoke, device management, recovery or security-event workflow is evidenced. |
| PM-232 settings notifications | `/{locale}/notifications` was previously reviewed as read-only; notification settings page renders labels only. | `MISSING_CAPABILITY` | No per-channel/device update/delivery/audit CTA is evidenced. |
| PM-225 about; PM-227 feedback; PM-228 help; PM-230 language; PM-235 support chat; PM-236 terms | No corresponding localized Web settings pages/CTAs were located in current route tree. | `MISSING_CAPABILITY` | No source evidence establishes these standalone settings/support/legal journeys. |

No upstream authorization, consent, storage deletion, notification delivery, session invalidation, or runtime claim is made from this source-only review.
