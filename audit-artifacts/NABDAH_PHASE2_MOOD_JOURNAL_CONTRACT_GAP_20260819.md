# Phase 2 Patient — mood journal contract gap

## Scope

The Patient mood journal uses real guarded Backend routes: `GET /mental-health/mood?days=7` and `POST /mental-health/mood`. Backend scopes all stored and retrieved entries by `patient_id`, so the route and ownership model are present. This review identifies semantic mismatches that make displayed wellness data incomplete or fabricated.

| Patient behavior | Backend schema/service | Finding | Required disposition |
|---|---|---|---|
| Sends fixed `energy_level: 3`, `stress_level: 3`, and `sleep_hours: 7` for every saved entry | Backend stores these fields as required values and uses them in mood statistics | Statistics are populated with values never supplied by the patient | **FIX — collect these values explicitly, or omit this journal feature until an intentional backend default contract exists** |
| Sends `activities` in POST body | `MoodEntry` schema contains mood, energy, stress, sleep, notes, tags, logged_at; no `activities` field | Activities are silently discarded, but the UI invites the patient to enter them | **FIX — add a reviewed backend contract/schema field or remove the input from the UI** |
| Renders historical note using `entry.note` | Backend persists `notes` (plural) | Patient notes are saved but never displayed in history | **FIX — use the canonical `notes` field** |
| Reads historical activities through `entry.activities` | Backend does not return stored activities | History UI assumes data that cannot exist | **FIX — align presentation to stored contract** |
| Save button has no request loading/idempotency guard | Backend `logMood` creates a new document per call | Double-tap or retry can create duplicate daily entries | **FIX — disable while pending and add an idempotency/day-entry policy if product requires one** |
| On history fetch failure, replaces results with empty list | Backend history is patient-scoped and may fail transiently | An honest empty state can mask a load failure | **FIX — distinguish error from genuinely empty history and provide retry** |

## Positive controls

The route is protected by `JwtAuthGuard` at controller level. Backend history queries by `patient_id` and timestamps, avoiding cross-patient history reads through this interface. Client moods map to Backend enum values (`great`, `good`, `okay`, `bad`, `terrible`).

## Decision

Mood journaling is not a missing-backend feature; it is a **contract-alignment and data-truthfulness remediation item**. It must not present hardcoded wellness metrics as patient-reported information. Mental-health safety, consent, localization, and crisis escalation remain separate Phase 2/Phase 7 verification gates.
