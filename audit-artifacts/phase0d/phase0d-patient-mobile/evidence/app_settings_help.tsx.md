# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/settings/help.tsx`
- **Member SHA-256:** `c99fd09f18b5312eb8f0d88fcae4bada665d965ff88017e16143dd50bf3dbe3e`
- **Line count:** 290
- **Read range:** `1-290`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `5: import { router } from "expo-router";`
- `29: export default function HelpCenterScreen() {`
- `55: <TouchableOpacity onPress={() => router.back()} style={styles.hBtn}>`
- `75: route: "/settings/support-chat",`
- `81: route: "/settings/feedback",`
- `87: route: null,`
- `92: onPress={() => {`
- `93: if (opt.route) router.push(opt.route as any);`
- `113: onPress={() => { setSelectedCat(selectedCat === cat.label ? null : cat.label); setExpandedFaq(null); }}`
- `141: onPress={() => setExpandedFaq(expandedFaq === i ? null : i)}`
- `160: onPress={() => router.push("/settings/support-chat")}`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `23: { icon: "refresh", label: "الإرجاع", color: "#F0A526" },`
### state_transitions
- `3: import React, { useState } from "react";`
- `33: const [expandedFaq, setExpandedFaq] = useState<number | null>(null);`
- `34: const [faqs, setFaqs] = useState<any[]>([]);`
- `35: const [loading, setLoading] = useState(true);`
- `36: const [selectedCat, setSelectedCat] = useState<string | null>(null);`
- `37: const [supportPhone, setSupportPhone] = useState<string | null>(null);`
- `43: .finally(() => setLoading(false));`
- `132: {loading ? (`
### payment_insurance_relevance
- `12: Card,`
- `21: { icon: "card", label: "الدفع", color: "#7A6BEA" },`
- `97: styles.contactCard,`
- `115: styles.catCard,`
- `143: styles.faqCard,`
- `207: contactCard: {`
- `234: catCard: {`
- `255: faqCard: {`
### error_empty_loading_retry_cancel
- `35: const [loading, setLoading] = useState(true);`
- `42: .catch(() => setFaqs([]))`
- `43: .finally(() => setLoading(false));`
- `46: .catch(() => {});`
- `94: else if (supportPhone) Linking.openURL(`tel:${supportPhone}`).catch(() => {});`
- `132: {loading ? (`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
