# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/wallet/cards.tsx`
- **Member SHA-256:** `57a035c92154ea2463a9e9d40658c153aec70ea344a99d9f4ea5dea5c535ec94`
- **Line count:** 505
- **Read range:** `1-505`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `12: import { router } from "expo-router";`
- `52: export default function CardsScreen() {`
- `100: { text: "إلغاء", style: "cancel" },`
- `104: onPress: async () => {`
- `183: onPress={() => setDefaultCard(card.id)}`
- `197: onPress={() => removeCard(card.id)}`
- `249: <IconButton icon="back" onPress={() => router.back()} />`
- `342: onPress={() => {`
- `346: onPress: async () => {`
- `361: onPress: async () => {`
- `374: { text: "إلغاء", style: "cancel" },`
### backend_consumers_or_contracts
- `65: const res = await apiFetch("/wallet/cards");`
- `106: const res = await apiFetch(`/wallet/cards/${cardId}`, {`
- `347: const res = await apiFetch("/wallet/cards", {`
- `362: const res = await apiFetch("/wallet/cards", {`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `2: import React, { useState, useEffect } from "react";`
- `7: StatusBar,`
- `55: const [cards, setCards] = useState<SavedCard[]>([]);`
- `56: const [loading, setLoading] = useState(true);`
- `64: setLoading(true);`
- `70: console.error(e);`
- `72: setLoading(false);`
- `100: { text: "إلغاء", style: "cancel" },`
- `198: style={[styles.actionBtn, { backgroundColor: colors.errorSurface }]}`
- `201: <AppText variant="labelSM" color={colors.error}>`
- `204: <Icon name="trash" size={16} color={colors.error} />`
- `210: const renderEmptyState = () => (`
### payment_insurance_relevance
- `20: Card,`
- `28: interface SavedCard {`
- `30: type: "visa" | "mastercard" | "mada";`
- `38: const CARD_TYPE_LABELS: Record<string, string> = {`
- `40: mastercard: "MASTERCARD",`
- `44: const CARD_TYPE_ICONS: Record<string, string> = {`
- `45: visa: "card",`
- `46: mastercard: "card",`
- `50: // INITIAL_CARDS removed, using backend data`
- `52: export default function CardsScreen() {`
- `55: const [cards, setCards] = useState<SavedCard[]>([]);`
- `59: loadCards();`
### error_empty_loading_retry_cancel
- `56: const [loading, setLoading] = useState(true);`
- `64: setLoading(true);`
- `69: } catch (e) {`
- `70: console.error(e);`
- `72: setLoading(false);`
- `100: { text: "إلغاء", style: "cancel" },`
- `110: } catch (e) {`
- `198: style={[styles.actionBtn, { backgroundColor: colors.errorSurface }]}`
- `201: <AppText variant="labelSM" color={colors.error}>`
- `204: <Icon name="trash" size={16} color={colors.error} />`
- `210: const renderEmptyState = () => (`
- `213: style={styles.emptyState}`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
