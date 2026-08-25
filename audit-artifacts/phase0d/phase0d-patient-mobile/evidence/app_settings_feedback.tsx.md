# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/settings/feedback.tsx`
- **Member SHA-256:** `1d1cedad8fc7e2ef06528b46392b6373fa0d24ddede93ff8048808f017943331`
- **Line count:** 234
- **Read range:** `1-234`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `5: import { router } from "expo-router";`
- `19: export default function FeedbackScreen() {`
- `62: onPress={() => router.back()}`
- `88: <TouchableOpacity onPress={() => router.back()}>`
- `103: <TouchableOpacity key={s} onPress={() => setRating(s)}>`
- `121: onPress={() => setType(t)}`
- `162: onPress={handleSend}`
- `175: <Icon name="upload" size={16} color={colors.primary} />`
### backend_consumers_or_contracts
- `33: await apiFetch('/support/feedback', {`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `3: import React, { useState } from "react";`
- `23: const [rating, setRating] = useState(0);`
- `24: const [type, setType] = useState("");`
- `25: const [text, setText] = useState("");`
- `26: const [sent, setSent] = useState(false);`
- `27: const [sending, setSending] = useState(false);`
- `39: setSent(true); // show success even if API fails, don't block UX`
### payment_insurance_relevance
- `12: Card,`
- `96: styles.card,`
- `112: styles.card,`
- `135: styles.card,`
- `194: card: {`
- `203: cardTitle: {`
### error_empty_loading_retry_cancel
- `38: } catch {`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
