# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/settings/data.tsx`
- **Member SHA-256:** `c07b14c3bb1a1267584a021ae601f5b8e17b0d8db5a0b49134d6b2f7501a79a9`
- **Line count:** 221
- **Read range:** `1-221`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `5: import { router } from "expo-router";`
- `18: export default function DataManagementScreen() {`
- `36: icon: "download",`
- `54: action: () => router.push("/settings/privacy"),`
- `77: <TouchableOpacity onPress={() => router.back()}>`
- `134: onPress={action.action}`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `43: icon: "refresh",`
### state_transitions
- `21: const [storageData, setStorageData] = React.useState<any[]>([]);`
- `22: const [totalStorage, setTotalStorage] = React.useState("0 MB");`
### payment_insurance_relevance
- `11: Card,`
- `22: const [totalStorage, setTotalStorage] = React.useState("0 MB");`
- `29: setTotalStorage(res.total || "0 MB");`
- `84: <View style={[styles.infoCard, { backgroundColor: "#EBF3FF" }]}>`
- `101: styles.storageCard,`
- `129: <AppText variant="bodySM">الإجمالي: {totalStorage} من 2 GB</AppText>`
- `136: styles.actionCard,`
- `166: infoCard: { borderRadius: 14, padding: 12 },`
- `174: storageCard: {`
- `183: cardTitle: {`
- `200: totalStorage: {`
- `206: actionCard: {`
### error_empty_loading_retry_cancel
- `32: .catch(() => {});`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
