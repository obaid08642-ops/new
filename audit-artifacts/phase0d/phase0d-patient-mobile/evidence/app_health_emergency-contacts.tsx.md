# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/health/emergency-contacts.tsx`
- **Member SHA-256:** `9b025b3e7088176b64534a8c1bded963ff299af540ec495f34f4d8b00f44f2fe`
- **Line count:** 280
- **Read range:** `1-280`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `16: import { router } from "expo-router";`
- `24: export default function EmergencyContactsScreen() {`
- `77: { text: "إلغاء", style: "cancel" },`
- `81: onPress: async () => {`
- `105: onPress={() => setShowAdd(true)}`
- `111: <TouchableOpacity onPress={() => router.back()}>`
- `139: onPress={() => Linking.openURL(`tel:${c.phone}`)}`
- `145: onPress={() => removeContact(c)}`
- `200: onPress={addContact}`
- `206: <TouchableOpacity onPress={() => setShowAdd(false)} style={[styles.saveBtn, { backgroundColor: colors.borderLight }]}>`
### backend_consumers_or_contracts
- `38: const res = await apiFetch('/health/emergency-contacts');`
- `56: const doc = await apiFetch('/health/emergency-contacts', {`
- `83: await apiFetch(`/health/emergency-contacts/${c.id}`, { method: 'DELETE' });`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `2: import React, { useState } from "react";`
- `28: const [contacts, setContacts] = useState<any[]>([]);`
- `29: const [loading, setLoading] = useState(true);`
- `30: const [showAdd, setShowAdd] = useState(false);`
- `31: const [saving, setSaving] = useState(false);`
- `32: const [name, setName] = useState("");`
- `33: const [relation, setRelation] = useState("");`
- `34: const [phone, setPhone] = useState("");`
- `41: console.error(err);`
- `43: setLoading(false);`
- `77: { text: "إلغاء", style: "cancel" },`
- `117: {loading && <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />}`
### payment_insurance_relevance
- `130: styles.card,`
- `171: <View style={[styles.modalCard, { backgroundColor: isDark ? colors.surface : colors.white }]}>`
- `226: card: {`
- `259: modalCard: {`
### error_empty_loading_retry_cancel
- `29: const [loading, setLoading] = useState(true);`
- `40: } catch (err) {`
- `41: console.error(err);`
- `43: setLoading(false);`
- `68: } catch (err: any) {`
- `77: { text: "إلغاء", style: "cancel" },`
- `85: } catch (err: any) {`
- `117: {loading && <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />}`
- `118: {!loading && contacts.length === 0 && (`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
