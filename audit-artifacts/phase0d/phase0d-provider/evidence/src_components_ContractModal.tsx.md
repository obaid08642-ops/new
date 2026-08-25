# Phase 0D semantic evidence

- **Surface:** Provider
- **Archive:** `NabdProvider-provider.zip`
- **Member path:** `src/components/ContractModal.tsx`
- **Member SHA-256:** `813beac15529a432a660f6563dea12274330f524b2be22db2225236bdc24be82`
- **Line count:** 132
- **Read range:** `1-132`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `53: <TouchableOpacity onPress={onClose} style={styles.closeBtn}>`
- `79: The Second Party acknowledges that all uploaded licenses and data are correct and valid, and bears full legal responsibility otherwise.`
- `116: onPress={async () => {`
### backend_consumers_or_contracts
- `6: import client from '../api/client';`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `1: import React, { useEffect, useState } from 'react';`
- `20: const [policy, setPolicy] = useState<{ content: string; version: string } | null>(null);`
- `21: const [loadingPolicy, setLoadingPolicy] = useState(false);`
- `22: const [accepting, setAccepting] = useState(false);`
- `25: setLoadingPolicy(true);`
- `29: .finally(() => setLoadingPolicy(false));`
- `58: {loadingPolicy && <ActivityIndicator color={theme.primary} style={{ marginVertical: SP.lg }} />}`
- `76: The Second Party (Service Provider) commits to providing all medical, laboratory, pharmaceutical, or nursing services according to the highest quality standards approved by the Ministry of Health.`
- `82: The service provider commits to responding to requests received via the platform within the specified time (depending on the service type), and updating the order status immediately upon execution.`
- `85: The Second Party agrees to the platform's commission rate which is deducted automatically from successful transactions.`
### payment_insurance_relevance
- `11: pricingDetails?: { labelAr: string; labelEn: string; price: string | number }[];`
- `102: <Text style={{fontWeight: 'bold', color: theme.text}}>{item.price} {AR ? 'ر.س' : 'SAR'}</Text>`
### error_empty_loading_retry_cancel
- `21: const [loadingPolicy, setLoadingPolicy] = useState(false);`
- `25: setLoadingPolicy(true);`
- `28: .catch(() => {})`
- `29: .finally(() => setLoadingPolicy(false));`
- `58: {loadingPolicy && <ActivityIndicator color={theme.primary} style={{ marginVertical: SP.lg }} />}`
- `82: The service provider commits to responding to requests received via the platform within the specified time (depending on the service type), and updating the order status immediately upon execution.`
- `119: try { await client.post('/legal/accept/provider_agreement', {}); } catch {}`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
