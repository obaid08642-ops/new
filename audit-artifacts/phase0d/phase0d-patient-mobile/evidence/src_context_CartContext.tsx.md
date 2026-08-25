# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/context/CartContext.tsx`
- **Member SHA-256:** `fe25d508eecb5532cc8410072b56abe3b5ca07571a596f1f5e6af2f2c3f12b59`
- **Line count:** 198
- **Read range:** `1-198`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `3: * Global cart state shared across all pharmacy screens.`
### backend_consumers_or_contracts
- `50: const data = await apiFetch('/cart');`
- `86: const data = await apiFetch('/cart/lines', {`
- `132: await apiFetch(`/cart/lines/${item.line_id}`, { method: 'DELETE' });`
- `152: await apiFetch(`/cart/lines/${item.line_id}`, { method: 'DELETE' });`
- `154: await apiFetch(`/cart/lines/${item.line_id}`, {`
- `169: await apiFetch('/cart/clear', {`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `3: * Global cart state shared across all pharmacy screens.`
- `6: import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';`
- `42: const [items, setItems] = useState<CartItem[]>([]);`
- `43: const [prescriptionUrl, setPrescriptionUrl] = useState<string | null>(null);`
- `44: const [paymentType, setPaymentType] = useState<'cash' | 'card' | 'insurance' | 'wallet' | 'wallet_split'>('card');`
- `122: // API call failed, ignore (guest fallback)`
- `196: if (!ctx) throw new Error('useCart must be used inside CartProvider');`
### payment_insurance_relevance
- `14: price: number;`
- `31: subtotal: number;`
- `35: paymentType: 'cash' | 'card' | 'insurance' | 'wallet' | 'wallet_split';`
- `36: setPaymentType: (type: 'cash' | 'card' | 'insurance' | 'wallet' | 'wallet_split') => void;`
- `44: const [paymentType, setPaymentType] = useState<'cash' | 'card' | 'insurance' | 'wallet' | 'wallet_split'>('card');`
- `57: price: i.price,`
- `92: price: item.price,`
- `111: price: i.price,`
- `179: const subtotal = useMemo(() => items.reduce((acc, i) => acc + i.price * i.qty, 0), [items]);`
- `185: itemCount, subtotal, hasRxItems,`
- `187: paymentType, setPaymentType`
### error_empty_loading_retry_cancel
- `69: } catch (e) {`
- `121: } catch (e) {`
- `122: // API call failed, ignore (guest fallback)`
- `133: } catch (e) {`
- `159: } catch (e) {`
- `173: } catch (e) {`
- `196: if (!ctx) throw new Error('useCart must be used inside CartProvider');`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
