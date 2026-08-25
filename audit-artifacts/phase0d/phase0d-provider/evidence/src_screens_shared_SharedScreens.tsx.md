# Phase 0D semantic evidence

- **Surface:** Provider
- **Archive:** `NabdProvider-provider.zip`
- **Member path:** `src/screens/shared/SharedScreens.tsx`
- **Member SHA-256:** `38b739bf782fbcd618ddb2d9b7fdf4be627b420eba1b3ec2eff9658cf0024183`
- **Line count:** 3097
- **Read range:** `1-3097`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `5: * ║ NABDAH PLUS – PHASE 6 · SHARED ADVANCED SCREENS ║`
- `6: * ║ 11 screens shared across ALL 6 provider types ║`
- `12: * ║ 05. OnboardingTutorial — intro slides (3-4 pages) ║`
- `66: name: t.name || t.booking_kind || '—',`
- `92: <TouchableOpacity onPress={onBack}><I name="back" size={20} color={theme.primary} /></TouchableOpacity>`
- `109: <TouchableOpacity onPress={() => setActiveChat(conv)}`
- `182: <TouchableOpacity onPress={onBack} style={{ padding: SP.xs }}><I name="back" size={20} color={theme.primary} /></TouchableOpacity>`
- `193: <TouchableOpacity onPress={() => show(AR ? 'بدء مكالمة صوتية' : 'Starting voice call', 'info')}>`
- `196: <TouchableOpacity onPress={() => show(AR ? 'بدء مكالمة فيديو' : 'Starting video call', 'info')}>`
- `233: <TouchableOpacity onPress={() => setShowAttach(true)} style={{ padding: SP.sm }}>`
- `243: <TouchableOpacity onPress={() => show(AR ? 'تسجيل صوتي' : 'Voice recording', 'info')} style={{ padding: SP.sm }}>`
- `246: <TouchableOpacity onPress={sendMsg} disabled={!msg.trim()}`
### backend_consumers_or_contracts
- `28: import client from '../../api/client';`
- `42: import { useInsuranceCatalog } from '../../api/catalogs';`
- `293: client.get('/provider/notifications')`
- `2004: const res = await fetch(`${API_BASE}/drugs/categories`, { headers });`
- `2024: const res = await fetch(`${API_BASE}/drugs?${q.toString()}`, { headers });`
- `2044: const res = await fetch(`${API_BASE}/drugs/${selectedDrug.id}`, { headers });`
- `2936: client.get('/provider/wallet'),`
- `2937: client.get('/provider/wallet/transactions').catch(() => ({ data: [] })),`
### auth_ownership
- `453: { id: 'd1', name: 'iPhone 15 Pro', os: 'iOS 18.2', lastLogin: AR ? 'الآن — نشط' : 'Now — Active', current: true },`
- `454: { id: 'd2', name: 'MacBook Pro', os: 'macOS 15.1', lastLogin: AR ? 'أمس 14:30' : 'Yesterday 14:30', current: false },`
- `455: { id: 'd3', name: 'Samsung Galaxy S24', os: 'Android 15', lastLogin: AR ? '3 أيام' : '3 days ago', current: false },`
- `465: sub={AR ? 'طبقة حماية إضافية — رمز يُرسل لجوالك عند كل تسجيل دخول' : 'Extra security layer — code sent to phone on each login'}`
- `470: <NToggle label={AR ? 'تسجيل دخول بالبصمة / الوجه' : 'Biometric Login'}`
- `471: sub={AR ? 'Face ID أو بصمة الإصبع لتسجيل الدخول السريع' : 'Face ID or fingerprint for quick login'}`
- `483: <Text style={{ fontSize: FS.xs, color: theme.textSub }}>{device.os} | {device.lastLogin}</Text>`
- `755: export function QRCodeSystem({ onBack }: { onBack: () => void; providerType?: string; providerId?: string }) {`
- `1090: : `Your ${amount} SAR request is now under finance-admin review. You will be notified of its status.`}`
- `1223: {h.status === 'rejected' && !!h.admin_note && (`
- `1225: {AR ? `سبب الرفض: ${h.admin_note}` : `Rejection reason: ${h.admin_note}`}`
- `1297: profession: j.scfhs_role || '', scfhs: j.scfhs_role || '', exp: '',`
### state_transitions
- `10: * ║ 03. SupportCenter — tickets + FAQ + status ║`
- `21: import React, { useState, useRef, useEffect, useCallback } from 'react';`
- `22: import { AppointmentStatus } from '../../types/contracts';`
- `34: NSecHeader, NConfirm, NEmpty, NDivider, NPriceInput, NCheckbox`
- `53: const [activeChat, setActiveChat] = useState<any | null>(null);`
- `54: const [search, setSearch] = useState('');`
- `55: const [conversations, setConversations] = useState<any[]>([]);`
- `56: const [loading, setLoading] = useState(true);`
- `60: setLoading(true);`
- `72: // API unavailable — show empty state (no demo data in production)`
- `75: setLoading(false);`
- `101: {loading ? (`
### payment_insurance_relevance
- `32: NBtn, NCard, NInput, NStatCard, NAvatar, NBadge,`
- `34: NSecHeader, NConfirm, NEmpty, NDivider, NPriceInput, NCheckbox`
- `42: import { useInsuranceCatalog } from '../../api/catalogs';`
- `281: insurance: { icon: 'shield', color: '#4CAF50' },`
- `283: payment: { icon: 'wallet', color: '#FF9800' },`
- `345: ListEmptyComponent={<NCard style={{ alignItems: 'center', padding: SP.xxl }}>`
- `348: </NCard>}`
- `363: { id: 't1', subject_ar: 'مشكلة في الدفع', subject_en: 'Payment issue', status: 'open', date: 'اليوم', priority: 'high' },`
- `369: { q_ar: 'كيف أسحب أرباحي؟', q_en: 'How to withdraw earnings?', a_ar: 'اذهب للمحفظة > سحب > أدخل المبلغ > تأكيد. الحد الأدنى 100 ريال.', a_en: 'Go to Wallet > Withdraw > Enter amount > Confirm. Minimum 100 SAR.' },`
- `370: { q_ar: 'كيف أحدّث أسعاري؟', q_en: 'How to update pricing?', a_ar: 'من الإعدادات > الأسعار والرسوم > عدّل السعر > حفظ.', a_en: 'Settings > Pricing > Edit price > Save.' },`
- `372: { q_ar: 'ما هي العمولة؟', q_en: 'What is the commission?', a_ar: 'نسبة عمولة المنصة تُحدد لك عند اعتماد حسابك وتظهر في صفحة المحفظة والإيرادات.', a_en: 'Your commission rate is set at account approval and shown in Wallet & Revenue.' },`
- `395: <NCard key={ticket.id} style={{ marginBottom: SP.md }}`
### error_empty_loading_retry_cancel
- `34: NSecHeader, NConfirm, NEmpty, NDivider, NPriceInput, NCheckbox`
- `56: const [loading, setLoading] = useState(true);`
- `60: setLoading(true);`
- `71: } catch (err) {`
- `72: // API unavailable — show empty state (no demo data in production)`
- `75: setLoading(false);`
- `101: {loading ? (`
- `103: <Text style={{ color: theme.textSub }}>{AR ? 'جاري التحميل...' : 'Loading...'}</Text>`
- `140: const [loading, setLoading] = useState(true);`
- `147: setLoading(true);`
- `151: } catch {`
- `157: setLoading(false);`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
