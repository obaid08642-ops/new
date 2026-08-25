# Phase 0D semantic evidence

- **Surface:** Provider
- **Archive:** `NabdProvider-provider.zip`
- **Member path:** `src/screens/facility/FacilityAnnouncementsScreen.tsx`
- **Member SHA-256:** `8b6f09493f5b9b155c2dfb28a03ab3731a6a53722d05a93b6a026fd71fc8f5ae`
- **Line count:** 98
- **Read range:** `1-98`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `8: export function FacilityAnnouncementsScreen({ onBack }: { onBack: () => void }) {`
- `68: <NBtn label={AR ? 'نشر التعميم' : 'Broadcast'} loading={sending} onPress={handleBroadcast} style={{ marginTop: SP.md }} />`
### backend_consumers_or_contracts
- `6: import client from '../../api/client';`
### auth_ownership
- `83: {ann.sender || (AR ? 'الإدارة' : 'Admin')}`
### state_transitions
- `1: import React, { useState, useEffect, useCallback } from 'react';`
- `4: import { NHeader, NCard, NScroll, NBtn, NEmpty } from '../../components/ui';`
- `14: const [message, setMessage] = useState('');`
- `15: const [announcements, setAnnouncements] = useState<any[]>([]);`
- `16: const [loading, setLoading] = useState(true);`
- `17: const [sending, setSending] = useState(false);`
- `23: } catch { setAnnouncements([]); } finally { setLoading(false); }`
- `34: show(AR ? 'تم نشر التعميم' : 'Announcement published', 'success');`
- `37: show(err?.response?.data?.message || (AR ? 'فشل نشر التعميم' : 'Failed to publish'), 'error');`
- `68: <NBtn label={AR ? 'نشر التعميم' : 'Broadcast'} loading={sending} onPress={handleBroadcast} style={{ marginTop: SP.md }} />`
- `75: {loading ? (`
- `78: <NEmpty title={AR ? 'لا توجد تعاميم بعد' : 'No announcements yet'} subtitle={AR ? 'أول تعميم تنشره سيظهر هنا' : 'Announcements you publish will appear here'} />`
### payment_insurance_relevance
- `4: import { NHeader, NCard, NScroll, NBtn, NEmpty } from '../../components/ui';`
- `48: <NCard style={{ marginBottom: SP.xl, backgroundColor: theme.primaryLight, borderColor: theme.primary }}>`
- `69: </NCard>`
- `80: <NCard key={ann.id} style={{ marginBottom: SP.md }}>`
- `92: </NCard>`
### error_empty_loading_retry_cancel
- `4: import { NHeader, NCard, NScroll, NBtn, NEmpty } from '../../components/ui';`
- `16: const [loading, setLoading] = useState(true);`
- `23: } catch { setAnnouncements([]); } finally { setLoading(false); }`
- `36: } catch (err: any) {`
- `37: show(err?.response?.data?.message || (AR ? 'فشل نشر التعميم' : 'Failed to publish'), 'error');`
- `68: <NBtn label={AR ? 'نشر التعميم' : 'Broadcast'} loading={sending} onPress={handleBroadcast} style={{ marginTop: SP.md }} />`
- `75: {loading ? (`
- `78: <NEmpty title={AR ? 'لا توجد تعاميم بعد' : 'No announcements yet'} subtitle={AR ? 'أول تعميم تنشره سيظهر هنا' : 'Announcements you publish will appear here'} />`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
