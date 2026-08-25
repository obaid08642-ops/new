# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/pharmacy/product-detail.tsx`
- **Member SHA-256:** `802cf1459cdb0cb7b70519063a0ff2bddbfbb3bd021fe81fa7cfdfd1b0f80001`
- **Line count:** 562
- **Read range:** `1-562`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `7: import { router, useLocalSearchParams, Stack } from 'expo-router';`
- `33: <TouchableOpacity style={[styles.accHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]} onPress={() => setOpen(!open)} activeOpacity={0.7}>`
- `65: export default function ProductDetailScreen() {`
- `77: // Now: the gesture must START within 28px of the screen edge AND travel`
- `85: if (i >= 0 && next) router.push({ pathname: '/pharmacy/product-detail', params: { id: next } });`
- `90: const startX = e.nativeEvent.pageX - g.dx; // gesture origin`
- `157: const submitSuggestion = async () => {`
- `187: isRTL ? 'هذا الدواء يتطلب إرفاق روشتة طبية سارية — سيُطلب رفعها في السلة قبل إتمام الدفع.' : 'This medicine requires a valid prescription — you will upload it in the cart before checkout.',`
- `231: <Stack.Screen options={{ title: seoTitle, headerShown: false }} />`
- `235: <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>`
- `238: <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/pharmacy/cart')}>`
- `257: <TouchableOpacity key={i} activeOpacity={0.9} onPress={() => { setActiveImage(i); setIsZoomVisible(true); }}>`
### backend_consumers_or_contracts
- `85: if (i >= 0 && next) router.push({ pathname: '/pharmacy/product-detail', params: { id: next } });`
- `123: const data = await apiFetch(`/medicines/${id}/details?lang=${currentDbLang()}`);`
- `162: await apiFetch(`/medicines/${id}/suggest-change`, {`
- `238: <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/pharmacy/cart')}>`
- `364: <TouchableOpacity key={alt.id} style={[styles.altCard, { backgroundColor: colors.s, borderColor: colors.bd }]} onPress={() => router.push({ pathname: '/pharmacy/product-detail', params: { id: alt.id } })}>`
- `386: <TouchableOpacity key={alt.id} style={[styles.altCard, { backgroundColor: colors.s, borderColor: colors.bd }]} onPress={() => router.push({ pathname: '/pharmacy/product-detail', params: { id: alt.id } })}>`
### auth_ownership
- `171: showLocalizedAlert(isRTL ? 'تم الإرسال' : 'Sent', isRTL ? 'وصل اقتراحك للإدارة وسيُطبَّق بعد الاعتماد. شكراً لك.' : 'Your suggestion reached the admin and will go live after approval.');`
- `419: {/* ── Suggest an edit (اقتراح تعديل) — reaches admin approval queue ── */}`
### state_transitions
- `2: import React, { useEffect, useState, useRef, useCallback } from 'react';`
- `26: const [open, setOpen] = useState(defaultOpen);`
- `101: const [med, setMed] = useState<any>(null);`
- `102: const [loading, setLoading] = useState(true);`
- `103: const [images, setImages] = useState<string[]>([]);`
- `104: const [isZoomVisible, setIsZoomVisible] = useState(false);`
- `105: const [suggestVisible, setSuggestVisible] = useState(false);`
- `106: const [suggestType, setSuggestType] = useState('field_edit');`
- `107: const [suggestField, setSuggestField] = useState('description_ar');`
- `108: const [suggestValue, setSuggestValue] = useState('');`
- `109: const [suggestNote, setSuggestNote] = useState('');`
- `110: const [suggestSending, setSuggestSending] = useState(false);`
### payment_insurance_relevance
- `143: const oldPrice = med?.old_price || 0;`
- `196: price: med.price || 0,`
- `314: {/* ── Name / manufacturer / price — elevated hero card ── */}`
- `315: <View style={[styles.heroCard, { backgroundColor: colors.s, borderColor: colors.bd, alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>`
- `324: <View style={[styles.priceRow, { flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', width: '100%' }]}>`
- `325: <View style={[styles.pricePill, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>`
- `326: <LocalizedText style={[styles.price, { color: '#F0695C' }]}>{(med.price || 0).toFixed(2)}</LocalizedText>`
- `329: {discount > 0 && oldPrice > 0 && (`
- `331: <LocalizedText style={styles.oldPrice}>{oldPrice.toFixed(2)} ر.س</LocalizedText>`
- `332: <LocalizedText style={{ fontFamily: 'Cairo-Bold', fontSize: 11, color: '#059669' }}>{isRTL ? `وفّر ${(oldPrice - (med.price || 0)).toFixed(2)} ر.س` : `Save ${(oldPrice - (med.price || 0)).toFixed(2)} SAR`}</LocalizedText>`
- `364: <TouchableOpacity key={alt.id} style={[styles.altCard, { backgroundColor: colors.s, borderColor: colors.bd }]} onPress={() => router.push({ pathname: '/pharmacy/product-detail', params: { id: alt.id } })}>`
- `370: <LocalizedText style={[styles.altPrice, { color: '#23B5CE' }]}>{(alt.price || 0).toFixed(2)} ر.س</LocalizedText>`
### error_empty_loading_retry_cancel
- `24: // ── Accordion — renders nothing when the API has no data for it ────────────`
- `102: const [loading, setLoading] = useState(true);`
- `131: } catch {`
- `134: setLoading(false);`
- `172: } catch (e) {`
- `173: showLocalizedAlert(isRTL ? 'تعذر الإرسال' : 'Failed', isRTL ? 'حاول مرة أخرى لاحقاً' : 'Please try again later');`
- `206: if (loading) {`
- `296: <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', color: '#F0A526', fontSize: 14, marginRight: 4 }}>error</LocalizedText>`
- `457: <LocalizedText style={{ fontFamily: 'Cairo-Bold', color: colors.t2, fontSize: 14 }}>{isRTL ? 'إلغاء' : 'Cancel'}</LocalizedText>`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
