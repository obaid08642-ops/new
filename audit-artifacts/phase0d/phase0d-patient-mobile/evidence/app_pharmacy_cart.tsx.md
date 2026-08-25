# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/pharmacy/cart.tsx`
- **Member SHA-256:** `3aabb16d4603e817318611d58771fdd7b74a22b3dafbb393010674740c1983b7`
- **Line count:** 262
- **Read range:** `1-262`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `5: * - Shows items added from any screen.`
- `6: * - Rx enforcement: blocks checkout if Rx items have no prescription.`
- `7: * - Routes to checkout on proceed.`
- `14: import { router } from 'expo-router';`
- `23: export default function PharmacyCartScreen() {`
- `31: // ─── Upload prescription ─────────────────────────────────────────────────────`
- `32: const handleUploadPrescription = useCallback(async () => {`
- `43: if (!result.canceled && result.assets[0]?.uri) {`
- `58: if (!result.canceled && result.assets[0]?.uri) {`
- `63: const proceedToCheckout = () => {`
- `65: router.push('/pharmacy/checkout');`
- `75: <TouchableOpacity style={styles.browseBtn} onPress={() => router.back()}>`
### backend_consumers_or_contracts
- `3: * app/pharmacy/cart.tsx`
- `65: router.push('/pharmacy/checkout');`
- `198: onPress={() => router.push('/pharmacy/manual-order')}`
### auth_ownership
- `33: const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();`
- `49: const { status } = await ImagePicker.requestCameraPermissionsAsync();`
### state_transitions
- `4: * Shopping cart — reads from CartContext (shared global state).`
- `33: const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();`
- `34: if (status !== 'granted') {`
- `43: if (!result.canceled && result.assets[0]?.uri) {`
- `49: const { status } = await ImagePicker.requestCameraPermissionsAsync();`
- `50: if (status !== 'granted') {`
- `58: if (!result.canceled && result.assets[0]?.uri) {`
- `68: // ─── Empty state ─────────────────────────────────────────────────────────────`
- `73: <LocalizedText style={[styles.emptyTitle, { color: colors.n } ]}>السلة فارغة</LocalizedText>`
- `74: <LocalizedText style={[styles.emptySubtitle, { color: colors.t2 } ]}>لم تقم بإضافة أي أدوية للسلة بعد</LocalizedText>`
- `234: emptyTitle: { fontFamily: 'Cairo-Black', fontSize: 22, marginTop: 16 },`
- `235: emptySubtitle: { fontFamily: 'Cairo-Regular', fontSize: 14, marginTop: 8, marginBottom: 24 },`
### payment_insurance_relevance
- `29: const { items, updateQty, removeItem, subtotal, hasRxItems, prescriptionUrl, setPrescriptionUrl, clearCart } = useCart();`
- `118: <LocalizedText style={[styles.itemPrice, { color: '#23B5CE' } ]}>{(item.price * item.qty).toFixed(2)} ر.س</LocalizedText>`
- `209: <View style={[styles.totalRow, { flexDirection: isRTL ? 'row-reverse' : 'row' } ]}>`
- `210: <LocalizedText style={[styles.totalLabel, { color: colors.t2 } ]}>المجموع التقديري</LocalizedText>`
- `211: <LocalizedText style={[styles.totalValue, { color: colors.n } ]}>{subtotal.toFixed(2)} <LocalizedText style={{ fontSize: 14, color: colors.t3 }}>ر.س</LocalizedText></LocalizedText>`
- `243: itemPrice: { fontFamily: 'Cairo-Black', fontSize: 16, marginTop: 4 },`
- `257: totalRow: { justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },`
- `258: totalLabel: { fontFamily: 'Cairo-Regular', fontSize: 15 },`
- `259: totalValue: { fontFamily: 'Cairo-Black', fontSize: 20 },`
### error_empty_loading_retry_cancel
- `43: if (!result.canceled && result.assets[0]?.uri) {`
- `58: if (!result.canceled && result.assets[0]?.uri) {`
- `68: // ─── Empty state ─────────────────────────────────────────────────────────────`
- `73: <LocalizedText style={[styles.emptyTitle, { color: colors.n } ]}>السلة فارغة</LocalizedText>`
- `74: <LocalizedText style={[styles.emptySubtitle, { color: colors.t2 } ]}>لم تقم بإضافة أي أدوية للسلة بعد</LocalizedText>`
- `234: emptyTitle: { fontFamily: 'Cairo-Black', fontSize: 22, marginTop: 16 },`
- `235: emptySubtitle: { fontFamily: 'Cairo-Regular', fontSize: 14, marginTop: 8, marginBottom: 24 },`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
