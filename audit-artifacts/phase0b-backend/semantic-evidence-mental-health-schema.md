# Phase 0B semantic evidence — Mental health schema

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/schemas/mental-health.schema.ts:1–98`

The file defines MoodValue and a fixed score map, MeditationType, BreathingTechnique, and timestamped MoodEntry, MeditationSession, BreathingSession and CrisisContact collections (`5–98`). MoodEntry requires indexed patient_id and enum mood, bounds energy/stress 1–5 and sleep 0–24, trims/limits notes, stores tags and required logged_at (`40–55`). MeditationSession stores patient_id, enum type, duration 1–180, completed and logged_at (`57–69`). BreathingSession stores patient_id, enum technique, rounds 1–100, duration 1–7200 and logged_at (`71–83`). CrisisContact stores patient_id, trimmed limited contact name/phone/relationship and is_professional (`85–97`).

Basic ranges/enums exist, but mood score is a local mapping with no version/source or clinical interpretation boundary (`7–21`). Mood tags are free-form and notes may contain sensitive mental-health narratives with no content classification, consent, access projection, encryption, retention or redaction (`48–50`). Sleep/energy/stress have no timestamp/timezone, measurement/source, repeat-entry or clinical threshold/alert semantics (`43–50`).

Meditation/breathing records lack session source/content version, adherence semantics, actual start/end, pause/replay/correction provenance and any clinical contraindication or distress/emergency escalation behavior (`57–83`). `completed` is a boolean without completion timestamp or transition/audit actor (`61–64`). Breathing round/duration consistency and technique-specific safety constraints are not declared (`75–78`).

CrisisContact phone/name/relationship are personal data, and `is_professional` is not tied to verified emergency/clinical service identity, jurisdiction, consent or availability (`85–93`). No emergency contact priority, verification, consent/notification acknowledgement, escalation outcome or safe deletion lifecycle exists. Patient ownership is represented only by a plain patient_id across all records; no caregiver/delegation, tenant or active-patient invariant is declared (`42–50,59–78,87–92`).

No idempotency/duplicate prevention, append-only correction, CAS/version, bounded history, notification/retry, crisis alert audit, soft-delete, deletion/DSAR/legal-hold or live mental-health runtime evidence is established. No code was changed and no build/test/application operation was performed during this read.
