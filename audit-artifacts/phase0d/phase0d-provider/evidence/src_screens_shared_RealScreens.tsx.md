# Phase 0D semantic evidence

- **Surface:** Provider
- **Archive:** `NabdProvider-provider.zip`
- **Member path:** `src/screens/shared/RealScreens.tsx`
- **Member SHA-256:** `9b925666429223807ecd50bf6f36597016939cb7176b432fb43a15b617fcb431`
- **Line count:** 410
- **Read range:** `1-410`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `8: // 1. REVIEWS AND RATINGS SCREEN`
- `9: export function ReviewsAndRatingsScreen({ onBack }: { onBack: () => void }) {`
- `73: <NBtn label={AR ? 'إرسال الرد' : 'Send'} size="sm" onPress={() => handleReply(rev.id)} />`
- `74: <NBtn label={AR ? 'إلغاء' : 'Cancel'} size="sm" variant="outline" onPress={() => setSelectedId(null)} />`
- `78: <TouchableOpacity onPress={() => { setSelectedId(rev.id); setReplyText(''); }}>`
- `91: // 2. WORKING HOURS EDITOR SCREEN`
- `102: export function WorkingHoursEditorScreen({ onBack }: { onBack: () => void }) {`
- `165: show(typeof msg === 'string' ? msg : (AR ? 'تعذر حفظ أوقات العمل — تحقق من الاتصال وحاول مجدداً' : 'Could not save working hours — check connection and retry'), 'error');`
- `188: actionLabel={AR ? 'إعادة المحاولة' : 'Retry'}`
- `217: <NBtn label={AR ? 'حفظ جدول العمل' : 'Save Working Hours'} onPress={handleSave} loading={saving} disabled={saving} style={{ marginTop: SP.md }} />`
- `224: // 3. SECURITY & 2FA MANAGEMENT SCREEN`
- `225: export function SecurityManagementScreen({ onBack }: { onBack: () => void }) {`
### backend_consumers_or_contracts
- `6: import client from '../../api/client';`
- `313: client.get('/provider/notifications')`
### auth_ownership
- `260: {AR ? 'إرسال رمز تحقق OTP إلى جوالك عند تسجيل الدخول' : 'Send OTP code on login'}`
### state_transitions
- `1: import React, { useState, useEffect, useCallback } from 'react';`
- `4: import { NHeader, NCard, NBtn, NInput, NBadge, NScroll, NEmpty } from '../../components/ui';`
- `14: const [reviews, setReviews] = useState<any[]>([]);`
- `15: const [replyText, setReplyText] = useState('');`
- `16: const [selectedId, setSelectedId] = useState<string | null>(null);`
- `28: show(AR ? 'تم إرسال الرد بنجاح' : 'Reply sent successfully', 'success');`
- `33: show(AR ? 'تعذر إرسال الرد' : 'Failed to send reply', 'error');`
- `74: <NBtn label={AR ? 'إلغاء' : 'Cancel'} size="sm" variant="outline" onPress={() => setSelectedId(null)} />`
- `108: const [loading, setLoading] = useState(true);`
- `109: const [loadErr, setLoadErr] = useState(false);`
- `110: const [saving, setSaving] = useState(false);`
- `111: const [hours, setHours] = useState<any[]>([]);`
### payment_insurance_relevance
- `4: import { NHeader, NCard, NBtn, NInput, NBadge, NScroll, NEmpty } from '../../components/ui';`
- `41: <NCard style={{ marginBottom: SP.md, alignItems: 'center', padding: SP.lg }}>`
- `46: </NCard>`
- `49: <NCard key={rev.id} style={{ marginBottom: SP.md }}>`
- `84: </NCard>`
- `194: <NCard key={item.day} style={{ marginBottom: SP.sm }}>`
- `214: </NCard>`
- `253: <NCard style={{ marginBottom: SP.md }}>`
- `265: </NCard>`
- `267: <NCard style={{ marginBottom: SP.md }}>`
- `275: </NCard>`
- `277: <NCard>`
### error_empty_loading_retry_cancel
- `4: import { NHeader, NCard, NBtn, NInput, NBadge, NScroll, NEmpty } from '../../components/ui';`
- `21: .catch(() => setReviews([]));`
- `32: } catch (e) {`
- `33: show(AR ? 'تعذر إرسال الرد' : 'Failed to send reply', 'error');`
- `74: <NBtn label={AR ? 'إلغاء' : 'Cancel'} size="sm" variant="outline" onPress={() => setSelectedId(null)} />`
- `108: const [loading, setLoading] = useState(true);`
- `114: setLoading(true); setLoadErr(false);`
- `128: } catch {`
- `131: setLoading(false);`
- `155: show(AR ? 'تأكد من صيغة الوقت (HH:MM) لكل يوم مفعّل' : 'Check time format (HH:MM) for every active day', 'error');`
- `163: } catch (e: any) {`
- `165: show(typeof msg === 'string' ? msg : (AR ? 'تعذر حفظ أوقات العمل — تحقق من الاتصال وحاول مجدداً' : 'Could not save working hours — check connection and retry'), 'error');`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
