# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/support/ticket.tsx`
- **Member SHA-256:** `2bb4a007efe26968918a27154d26702fdf9903e630233e843f160581dad4e40e`
- **Line count:** 142
- **Read range:** `1-142`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `5: import { router } from "expo-router";`
- `19: export default function TicketTrackingScreen() {`
- `44: onPress={() => router.push("/support/chat")}`
- `50: <TouchableOpacity onPress={() => router.back()}>`
- `69: onPress={() => router.push("/support/chat")}`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `22: const [tickets, setTickets] = React.useState<any[]>([]);`
- `23: const [loading, setLoading] = React.useState(true);`
- `29: .finally(() => setLoading(false));`
- `57: {loading ? (`
- `75: borderRightColor: t.statusColor || "#23B5CE",`
- `86: styles.statusBadge,`
- `87: { backgroundColor: (t.statusColor || "#23B5CE") + "15" },`
- `90: <AppText variant="bodySM">{t.status || "مفتوح"}</AppText>`
- `134: statusBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },`
- `135: status: { fontSize: 11, fontWeight: "800" } as any,`
### payment_insurance_relevance
- `11: Card,`
- `71: styles.ticketCard,`
- `116: ticketCard: {`
### error_empty_loading_retry_cancel
- `23: const [loading, setLoading] = React.useState(true);`
- `28: .catch(() => setTickets([]))`
- `29: .finally(() => setLoading(false));`
- `57: {loading ? (`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
