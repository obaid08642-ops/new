# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/utils/mood-journal-contract.ts`
- **Member SHA-256:** `52f709e95ddd4f4e9cbc17890636b4205a37c002a9313e89d5afc1ab34e891f2`
- **Line count:** 117
- **Read range:** `1-117`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `29: throw new Error(`${label} must be an object`);`
- `37: throw new Error(`${label} must be an integer from 1 to 5`);`
- `45: throw new Error('sleep_hours must be a finite number from 0 to 24');`
- `52: throw new Error('Mood history entry is missing a valid logged_at date');`
- `60: throw new Error('Mood history tags must be a unique non-empty string list');`
- `67: * than replacing a failed history request with a clinically misleading empty list.`
- `70: if (!Array.isArray(value)) throw new Error('Mood history response must be an array');`
- `75: throw new Error('Mood history entry has an invalid mood');`
- `78: throw new Error('Mood history entry has invalid notes');`
- `101: if (!draft.mood || !MOODS.has(draft.mood)) throw new Error('A mood selection is required');`
- `110: if (!Number.isFinite(sleep) || sleep < 0 || sleep > 24) throw new Error('sleep_hours must be a finite number from 0 to 24');`
### payment_insurance_relevance
- `23: export type MoodJournalPayload = Pick<MoodEntry, 'mood'> & Partial<Pick<MoodEntry, 'energy_level' | 'stress_level' | 'sleep_hours' | 'notes' | 'tags'>>;`
- `66: * The API returns a raw patient-owned array. Refuse an unexpected payload rather`
- `100: export function buildMoodJournalPayload(draft: MoodJournalDraft): MoodJournalPayload {`
- `102: const payload: MoodJournalPayload = { mood: draft.mood };`
- `105: if (energy !== undefined) payload.energy_level = energy;`
- `106: if (stress !== undefined) payload.stress_level = stress;`
- `111: payload.sleep_hours = sleep;`
- `113: if (draft.note.trim()) payload.notes = draft.note.trim();`
- `115: if (tags?.length) payload.tags = tags;`
- `116: return payload;`
### error_empty_loading_retry_cancel
- `29: throw new Error(`${label} must be an object`);`
- `37: throw new Error(`${label} must be an integer from 1 to 5`);`
- `45: throw new Error('sleep_hours must be a finite number from 0 to 24');`
- `52: throw new Error('Mood history entry is missing a valid logged_at date');`
- `60: throw new Error('Mood history tags must be a unique non-empty string list');`
- `67: * than replacing a failed history request with a clinically misleading empty list.`
- `70: if (!Array.isArray(value)) throw new Error('Mood history response must be an array');`
- `75: throw new Error('Mood history entry has an invalid mood');`
- `78: throw new Error('Mood history entry has invalid notes');`
- `101: if (!draft.mood || !MOODS.has(draft.mood)) throw new Error('A mood selection is required');`
- `110: if (!Number.isFinite(sleep) || sleep < 0 || sleep > 24) throw new Error('sleep_hours must be a finite number from 0 to 24');`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
