# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/reviews/index.tsx`
- **Member SHA-256:** `58497e2a9618db032f00b99080c92b1fadd4777afc88e6724afd6e8da64d6c0c`
- **Line count:** 333
- **Read range:** `1-333`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `13: import { router, useLocalSearchParams } from "expo-router";`
- `35: export default function ReviewsScreen() {`
- `46: const [submitted, setSubmitted] = useState(false);`
- `47: const [submitting, setSubmitting] = useState(false);`
- `49: const bookingKind = String(params.booking_kind || 'appointment');`
- `50: const bookingId = String(params.booking_id || params.appointmentId || '');`
- `55: const handleSubmit = async () => {`
- `56: if (overallRating === 0 || submitting) return;`
- `57: if (!bookingId) {`
- `61: setSubmitting(true);`
- `67: booking_kind: bookingKind,`
- `68: booking_id: bookingId,`
### backend_consumers_or_contracts
- `64: await apiFetch('/patient-ux/review', {`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `3: import React, { useState } from "react";`
- `40: const [overallRating, setOverallRating] = useState(0);`
- `41: const [aspectRatings, setAspectRatings] = useState<Record<string, number>>(`
- `44: const [review, setReview] = useState("");`
- `45: const [anonymous, setAnonymous] = useState(false);`
- `46: const [submitted, setSubmitted] = useState(false);`
- `47: const [submitting, setSubmitting] = useState(false);`
- `63: // E2: real review endpoint (was a fake 1.5s success — nothing was ever saved)`
- `86: <View style={styles.successContainer}>`
- `237: successContainer: {`
- `243: successTitle: { color: "#fff", fontSize: 24, fontWeight: "800" },`
- `244: successSub: {`
### payment_insurance_relevance
- `20: Card,`
- `117: styles.card,`
- `146: styles.card,`
- `174: styles.card,`
- `271: card: {`
- `280: cardTitle: {`
### error_empty_loading_retry_cancel
- `76: setTimeout(() => router.back(), 1500);`
- `77: } catch (e: any) {`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
