# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `lib/api/mental-health.ts`
- **Member SHA-256:** `c46cd38374b12bf04d4933e40f2e3ff93c74f400ce94bbd362ca01dda2e3b76e`
- **Line count:** 5
- **Read range:** `1-5`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `3: const meditation = z.object({ total_sessions: z.number().int().min(0).max(100000), completed_sessions: z.number().int().min(0).max(100000), total_minutes: z.number().min(0).max(10000000) }).passthrough();`
- `4: export type WellbeingDashboard = { mood: { totalEntries: number; avgMood: number|null; avgEnergy: number|null; avgStress: number|null; avgSleep: number|null }; meditation: { totalSessions: number; completedSessions: number; totalMinutes: nu`
- `5: export function parseWellbeingDashboard(payload: unknown): WellbeingDashboard | null { const root=payload&&typeof payload==='object'&&!Array.isArray(payload)?payload as Record<string,unknown>:null; const p=z.object({mood:stat,meditation}).s`
### state_transitions
- `3: const meditation = z.object({ total_sessions: z.number().int().min(0).max(100000), completed_sessions: z.number().int().min(0).max(100000), total_minutes: z.number().min(0).max(10000000) }).passthrough();`
- `4: export type WellbeingDashboard = { mood: { totalEntries: number; avgMood: number|null; avgEnergy: number|null; avgStress: number|null; avgSleep: number|null }; meditation: { totalSessions: number; completedSessions: number; totalMinutes: nu`
- `5: export function parseWellbeingDashboard(payload: unknown): WellbeingDashboard | null { const root=payload&&typeof payload==='object'&&!Array.isArray(payload)?payload as Record<string,unknown>:null; const p=z.object({mood:stat,meditation}).s`
### payment_insurance_relevance
- `2: const stat = z.object({ total_entries: z.number().int().min(0).max(100000), avg_mood: z.number().nullable(), avg_energy: z.number().nullable(), avg_stress: z.number().nullable(), avg_sleep: z.number().nullable() }).passthrough();`
- `3: const meditation = z.object({ total_sessions: z.number().int().min(0).max(100000), completed_sessions: z.number().int().min(0).max(100000), total_minutes: z.number().min(0).max(10000000) }).passthrough();`
- `4: export type WellbeingDashboard = { mood: { totalEntries: number; avgMood: number|null; avgEnergy: number|null; avgStress: number|null; avgSleep: number|null }; meditation: { totalSessions: number; completedSessions: number; totalMinutes: nu`
- `5: export function parseWellbeingDashboard(payload: unknown): WellbeingDashboard | null { const root=payload&&typeof payload==='object'&&!Array.isArray(payload)?payload as Record<string,unknown>:null; const p=z.object({mood:stat,meditation}).s`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
