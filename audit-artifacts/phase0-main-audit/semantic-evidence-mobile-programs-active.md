# Semantic evidence — Mobile Active Programs

Baseline: `22526bedb77a3d8148219036367e4714f401aecc`.

`audit-work/source/nabd_plus_patient_app/app/programs/active.tsx:13–27` defines a fallback diabetes program with fixed title, six-month duration, zero/6 sessions, a fabricated next-session title/time, and a 150-point milestone reward. `loadPrograms` calls `/medical/programs/active` but substitutes this fallback for both an empty response and any error (`:37–60`), so no-program, unavailable, unauthenticated and server-error states can appear as an active clinical program.

The “confirm attendance or reschedule” button is implemented as a local alert claiming attendance was successfully confirmed (`:146–161`); it does not call an attendance/reschedule endpoint, preserve a session/appointment ID, or expose a real transition. The screen therefore presents a false-success action.

`handleMarkCompleted` posts `/medical/programs/complete-session` with `programType` and `sessionId` (`:62–90`), but no visible Idempotency-Key, owner/role binding, state/version precondition, schedule validity, duplicate completion handling or replay protection is present. On any truthy response it replaces programs with `res` without normalizing the response shape; session 4 triggers a reward alert based on local `selectedProg.milestoneReward`, not a server reward ledger.

Progress percentage is calculated from unvalidated `completedSessions/totalSessions` (`:132–143`), tabs use unvalidated IDs/titles (`:107–121`), and no explicit expired/paused/completed/withdrawn/failed enrollment state, consent, clinical safety, reward settlement, notification or booking/payment linkage is shown. No Phase 0 remediation was made.
