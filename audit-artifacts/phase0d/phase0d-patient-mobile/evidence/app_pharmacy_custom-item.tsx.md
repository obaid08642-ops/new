# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/pharmacy/custom-item.tsx`
- **Member SHA-256:** `d181b681d23b2a0ce8ed4e31ad448e24cec7d1ad879dfa404e803e767b2b597a`
- **Line count:** 405
- **Read range:** `1-405`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `12: import { router } from "expo-router";`
- `26: export default function CustomItemScreen() {`
- `35: const [uploading, setUploading] = useState(false);`
- `36: const [submitting, setSubmitting] = useState(false);`
- `37: const [submitted, setSubmitted] = useState(false);`
- `39: // E2: real prescription upload (was a fake toggle that uploaded nothing)`
- `49: if (result.canceled || !result.assets?.[0]) return;`
- `51: setUploading(true);`
- `55: const res = await apiFetch('/media/upload', { method: 'POST', body: form });`
- `64: setUploading(false);`
- `69: const handleSubmit = async () => {`
- `70: if (!name.trim() || submitting) return;`
### backend_consumers_or_contracts
- `55: const res = await apiFetch('/media/upload', { method: 'POST', body: form });`
- `79: await apiFetch('/support/requests', {`
- `116: onPress={() => router.replace("/(tabs)/pharmacy")}`
### auth_ownership
- `43: const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();`
### state_transitions
- `2: import React, { useState } from "react";`
- `30: const [name, setName] = useState("");`
- `31: const [dose, setDose] = useState("");`
- `32: const [qty, setQty] = useState("1");`
- `33: const [note, setNote] = useState("");`
- `34: const [prescriptionUrl, setPrescriptionUrl] = useState<string | null>(null);`
- `35: const [uploading, setUploading] = useState(false);`
- `36: const [submitting, setSubmitting] = useState(false);`
- `37: const [submitted, setSubmitted] = useState(false);`
- `49: if (result.canceled || !result.assets?.[0]) return;`
- `51: setUploading(true);`
- `64: setUploading(false);`
### payment_insurance_relevance
- `18: Card,`
- `155: styles.infoCard,`
- `205: styles.fieldCard,`
- `242: styles.fieldCard,`
- `351: infoCard: { borderRadius: 14, padding: 12 },`
- `359: fieldCard: {`
### error_empty_loading_retry_cancel
- `35: const [uploading, setUploading] = useState(false);`
- `49: if (result.canceled || !result.assets?.[0]) return;`
- `51: setUploading(true);`
- `61: } catch (e: any) {`
- `64: setUploading(false);`
- `90: } catch (e: any) {`
- `278: disabled={uploading}`
- `293: {uploading ? (`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
