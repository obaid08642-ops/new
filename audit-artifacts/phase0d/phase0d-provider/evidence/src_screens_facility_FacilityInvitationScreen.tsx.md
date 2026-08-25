# Phase 0D semantic evidence

- **Surface:** Provider
- **Archive:** `NabdProvider-provider.zip`
- **Member path:** `src/screens/facility/FacilityInvitationScreen.tsx`
- **Member SHA-256:** `1c4a76f9bf2eb576ab3af0de8b9f388dd24e22e43b4166418d0d9923a9ee86a7`
- **Line count:** 147
- **Read range:** `1-147`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `9: export function FacilityInvitationScreen({ onBack, preRole }: { onBack: () => void; preRole?: string }) {`
- `86: <NBtn label={AR ? 'عودة للإدارة' : 'Back to Management'} onPress={onBack} />`
- `141: onPress={handleInvite}`
### backend_consumers_or_contracts
- `7: import client from '../../api/client';`
### auth_ownership
- `9: export function FacilityInvitationScreen({ onBack, preRole }: { onBack: () => void; preRole?: string }) {`
- `19: // Permission Matrix State`
- `33: const PERMISSION_LABELS = [`
- `55: role: preRole || 'doctor',`
- `56: permissions: perms,`
- `84: : `A notification has been sent to (${identifier}). Once accepted, they will join the facility staff with the specified permissions.`}`
- `113: <NSecHeader title={AR ? 'مصفوفة الصلاحيات (Permission Matrix)' : 'Permission Matrix'} />`
- `119: {PERMISSION_LABELS.map((p, i) => (`
- `126: borderBottomWidth: i < PERMISSION_LABELS.length - 1 ? 1 : 0,`
### state_transitions
- `1: import React, { useState } from 'react';`
- `15: const [identifier, setIdentifier] = useState('');`
- `16: const [loading, setLoading] = useState(false);`
- `17: const [invited, setInvited] = useState(false);`
- `19: // Permission Matrix State`
- `20: const [perms, setPerms] = useState({`
- `51: setLoading(true);`
- `59: show(AR ? 'تم إرسال الدعوة بنجاح' : 'Invitation sent successfully', 'success');`
- `61: const st = e?.response?.status;`
- `62: if (st === 404) show(AR ? 'لا يوجد حساب مزود بهذا المعرف' : 'No provider account with this identifier', 'error');`
- `63: else if (st === 400) show(AR ? 'تعذر إرسال الدعوة — تحقق من البيانات' : 'Could not send invitation', 'error');`
- `64: else show(AR ? 'حدث خطأ أثناء إرسال الدعوة' : 'Error sending invitation', 'error');`
### payment_insurance_relevance
- `4: import { NHeader, NCard, NInput, NBtn, NSecHeader, NScroll } from '../../components/ui';`
- `23: insurance: true,`
- `30: manage_wallet: false`
- `36: { key: 'insurance', ar: 'شركات التأمين', en: 'Insurance Networks' },`
- `43: { key: 'manage_wallet', ar: 'إدارة المحفظة المالية', en: 'Manage Wallet' },`
- `96: <NCard style={{ backgroundColor: theme.infoBg, marginBottom: SP.xl }}>`
- `102: </NCard>`
### error_empty_loading_retry_cancel
- `16: const [loading, setLoading] = useState(false);`
- `51: setLoading(true);`
- `60: } catch (e: any) {`
- `62: if (st === 404) show(AR ? 'لا يوجد حساب مزود بهذا المعرف' : 'No provider account with this identifier', 'error');`
- `63: else if (st === 400) show(AR ? 'تعذر إرسال الدعوة — تحقق من البيانات' : 'Could not send invitation', 'error');`
- `64: else show(AR ? 'حدث خطأ أثناء إرسال الدعوة' : 'Error sending invitation', 'error');`
- `66: setLoading(false);`
- `142: loading={loading}`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
