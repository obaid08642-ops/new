# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `lib/api/settings.ts`
- **Member SHA-256:** `54db00e7c52912085ad99384b44c85336a2ed4f1ea4800da12fd6d2773cc00ff`
- **Line count:** 40
- **Read range:** `1-40`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `7: const sessionSchema = z.object({ device: z.string().max(160).nullable().optional(), expires_in_seconds: z.number().int().min(0).max(31536000).optional() }).passthrough();`
- `18: export type SessionSummary = { device?: string | null; expiresInSeconds?: number };`
- `30: export function parseSessions(payload: unknown): SessionSummary[] {`
- `32: const list = Array.isArray(payload) ? payload : Array.isArray(root?.data) ? root.data : Array.isArray(root?.sessions) ? root.sessions : [];`
- `33: return list.flatMap((item) => { const parsed = sessionSchema.safeParse(item); if (!parsed.success) return []; return [{ device: parsed.data.device, expiresInSeconds: parsed.data.expires_in_seconds }]; });`
### state_transitions
- `22: return parsed.success ? { profileVisible: parsed.data.profile_visible, shareData: parsed.data.share_data } : {};`
- `27: return parsed.success ? { biometric: parsed.data.biometric, twoFactor: parsed.data.two_factor } : {};`
- `33: return list.flatMap((item) => { const parsed = sessionSchema.safeParse(item); if (!parsed.success) return []; return [{ device: parsed.data.device, expiresInSeconds: parsed.data.expires_in_seconds }]; });`
- `38: if (!parsed.success) return { items: [] };`
### payment_insurance_relevance
- `6: const storageSchema = z.object({ used: z.string().max(80).optional(), total: z.string().max(80).optional(), items: z.array(storageItemSchema).max(20).optional() }).passthrough();`
- `9: function record(payload: unknown): Record<string, unknown> | null {`
- `10: if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;`
- `11: const root = payload as Record<string, unknown>;`
- `17: export type StorageSummary = { used?: string; total?: string; items: { label: string; value: string; percent: number }[] };`
- `20: export function parsePrivacySettings(payload: unknown): PrivacySettings {`
- `21: const parsed = privacySchema.safeParse(record(payload));`
- `25: export function parseSecuritySettings(payload: unknown): SecuritySettings {`
- `26: const parsed = securitySchema.safeParse(record(payload));`
- `30: export function parseSessions(payload: unknown): SessionSummary[] {`
- `31: const root = payload && typeof payload === "object" && !Array.isArray(payload) ? payload as Record<string, unknown> : null;`
- `32: const list = Array.isArray(payload) ? payload : Array.isArray(root?.data) ? root.data : Array.isArray(root?.sessions) ? root.sessions : [];`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
