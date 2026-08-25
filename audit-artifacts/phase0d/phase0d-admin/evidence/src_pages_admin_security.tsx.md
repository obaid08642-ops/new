# Phase 0D semantic evidence

- **Surface:** Admin
- **Archive:** `web_admin_dashboard.zip`
- **Member path:** `src/pages/admin/security.tsx`
- **Member SHA-256:** `0f76507f94d92a11947e367fe6430f0d25eda878903ddedc30aa914318d3272d`
- **Line count:** 173
- **Read range:** `1-173`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `109: placeholder="اسم الجهاز (مثال: iPhone 15 / MacBook)"`
- `117: onClick={enroll} disabled={busy}`
- `156: onClick={() => remove(d.credential_id)} disabled={busy}`
### backend_consumers_or_contracts
- `30: const list = await apiFetch('/auth/passkey/devices');`
- `45: const options = await apiFetch('/auth/passkey/enroll/options', { method: 'POST' });`
- `48: await apiFetch('/auth/passkey/enroll/verify', {`
- `69: await apiFetch(`/auth/passkey/devices/${encodeURIComponent(credentialId)}`, { method: 'DELETE' });`
### auth_ownership
- `14: * Admin security settings — enroll/manage Passkey (WebAuthn) devices for the`
- `15: * designated admin account. Enrollment is server-gated: only the designated`
- `16: * admin email with role admin/super_admin can call these endpoints.`
- `20: export default function AdminSecurity() {`
### state_transitions
- `1: import React, { useEffect, useState } from 'react';`
- `21: const [devices, setDevices] = useState<PasskeyDevice[]>([]);`
- `22: const [loading, setLoading] = useState(true);`
- `23: const [busy, setBusy] = useState(false);`
- `24: const [deviceName, setDeviceName] = useState('');`
- `25: const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);`
- `28: setLoading(true);`
- `35: setLoading(false);`
- `58: text: e?.name === 'NotAllowedError' ? 'تم إلغاء التسجيل أو انتهت المهلة' : 'فشل تسجيل الجهاز',`
- `134: {loading ? (`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `22: const [loading, setLoading] = useState(true);`
- `28: setLoading(true);`
- `32: } catch (e: any) {`
- `35: setLoading(false);`
- `55: } catch (e: any) {`
- `58: text: e?.name === 'NotAllowedError' ? 'تم إلغاء التسجيل أو انتهت المهلة' : 'فشل تسجيل الجهاز',`
- `72: } catch (e: any) {`
- `134: {loading ? (`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
