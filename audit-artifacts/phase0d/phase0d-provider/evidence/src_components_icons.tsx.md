# Phase 0D semantic evidence

- **Surface:** Provider
- **Archive:** `NabdProvider-provider.zip`
- **Member path:** `src/components/icons.tsx`
- **Member SHA-256:** `fbc6ef58fecdb9d5a64953cb8ac84364e219f8371fa4b29d3d3f31bc159beab7`
- **Line count:** 273
- **Read range:** `1-273`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `65: upload: ['M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4','M17 8l-5-5-5 5','M12 3v12'],`
- `66: download: ['M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4','M7 10l5 5 5-5','M12 15V3'],`
- `90: logout: ['M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4','M16 17l5-5-5-5','M21 12H9'],`
- `115: bookOpen: ['M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z','M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z'],`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `47: refresh: ['M23 4v6h-6','M1 20v-6h6','M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15'],`
- `90: logout: ['M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4','M16 17l5-5-5-5','M21 12H9'],`
### state_transitions
- `44: // Status`
- `131: // ─── Aliases & previously-missing names (were rendering as empty boxes) ────`
- `251: // ─── Status Dot ───────────────────────────────────────────────────────────────`
- `252: export function StatusDot({ status, size = 10 }: { status: 'online'|'offline'|'busy'|'away'; size?: number }) {`
- `254: return <View style={{ width:size, height:size, borderRadius:size/2, backgroundColor:colors[status]??'#9E9E9E' }} />;`
- `259: rating, max = 5, size = 16, color = '#FFC107', emptyColor = '#E0E0E0',`
- `260: }: { rating: number; max?: number; size?: number; color?: string; emptyColor?: string }) {`
- `266: stroke={i < Math.floor(rating) ? color : emptyColor}`
### payment_insurance_relevance
- `32: wallet: ['M21 18V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2h14a2 2 0 002-2z','M21 12h-5a2 2 0 000 4h5'],`
- `145: payments: ['M21 18V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2h14a2 2 0 002-2z','M3 10h18','M7 15h4'],`
### error_empty_loading_retry_cancel
- `131: // ─── Aliases & previously-missing names (were rendering as empty boxes) ────`
- `252: export function StatusDot({ status, size = 10 }: { status: 'online'|'offline'|'busy'|'away'; size?: number }) {`
- `253: const colors: Record<string, string> = { online:'#4CAF50', offline:'#9E9E9E', busy:'#F44336', away:'#FF9800' };`
- `259: rating, max = 5, size = 16, color = '#FFC107', emptyColor = '#E0E0E0',`
- `260: }: { rating: number; max?: number; size?: number; color?: string; emptyColor?: string }) {`
- `266: stroke={i < Math.floor(rating) ? color : emptyColor}`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
