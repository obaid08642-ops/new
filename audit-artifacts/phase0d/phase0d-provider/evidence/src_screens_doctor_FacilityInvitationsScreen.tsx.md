# Phase 0D semantic evidence

- **Surface:** Provider
- **Archive:** `NabdProvider-provider.zip`
- **Member path:** `src/screens/doctor/FacilityInvitationsScreen.tsx`
- **Member SHA-256:** `836bb3256eb15cf102cda6643b563f654673546d550d211d3b05a8d2f4fea183`
- **Line count:** 133
- **Read range:** `1-133`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `23: export function FacilityInvitationsScreen({ onBack }: { onBack: () => void }) {`
- `123: <NBtn label={busyId === inv.id ? '...' : (AR ? 'قبول وانضمام' : 'Accept & Join')} onPress={() => handleAccept(inv.id)} style={{ flex: 1 }} />`
- `124: <NBtn label={AR ? 'رفض' : 'Decline'} onPress={() => handleReject(inv.id)} variant="outline" style={{ flex: 1, borderColor: theme.danger }} labelStyle={{ color: theme.danger }} />`
### backend_consumers_or_contracts
- `6: import client from '../../api/client';`
### auth_ownership
- `2: import { View, Text, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';`
- `9: // Permission keys → labels (must mirror the facility invitation form)`
- `41: permissions: Object.keys(i.permissions || {}).filter(k => i.permissions[k]),`
- `110: {AR ? 'الصلاحيات المطلوبة (Permissions):' : 'Requested Permissions:'}`
- `114: {inv.permissions.map((perm, i) => (`
### state_transitions
- `1: import React, { useState, useEffect, useCallback } from 'react';`
- `29: const [invitations, setInvitations] = useState<any[]>([]);`
- `30: const [loading, setLoading] = useState(true);`
- `31: const [busyId, setBusyId] = useState<string | null>(null);`
- `40: status: i.status,`
- `47: setLoading(false);`
- `58: setInvitations(prev => prev.map(inv => inv.id === id ? { ...inv, status: accept ? 'accepted' : 'rejected' } : inv));`
- `62: : (AR ? 'تم رفض الدعوة' : 'Invitation rejected'),`
- `63: accept ? 'success' : 'info',`
- `69: : (AR ? 'تعذر تنفيذ العملية' : 'Action failed'), 'error');`
- `84: {loading ? (`
- `86: {AR ? 'جاري تحميل الدعوات...' : 'Loading invitations...'}`
### payment_insurance_relevance
- `4: import { NHeader, NCard, NBtn, NSecHeader, NScroll, NBadge } from '../../components/ui';`
- `13: insurance: { ar: 'شركات التأمين', en: 'Insurance' },`
- `20: manage_wallet: { ar: 'إدارة المحفظة', en: 'Wallet' },`
- `94: <NCard key={inv.id} style={{ marginBottom: SP.lg, borderColor: inv.status === 'pending' ? theme.primary : theme.border }}>`
- `127: </NCard>`
### error_empty_loading_retry_cancel
- `30: const [loading, setLoading] = useState(true);`
- `44: } catch {`
- `47: setLoading(false);`
- `65: } catch (e: any) {`
- `69: : (AR ? 'تعذر تنفيذ العملية' : 'Action failed'), 'error');`
- `84: {loading ? (`
- `86: {AR ? 'جاري تحميل الدعوات...' : 'Loading invitations...'}`
- `90: {AR ? 'لا توجد دعوات حالياً' : 'No pending invitations'}`
- `94: <NCard key={inv.id} style={{ marginBottom: SP.lg, borderColor: inv.status === 'pending' ? theme.primary : theme.border }}>`
- `100: label={inv.status === 'pending' ? (AR ? 'قيد الانتظار' : 'Pending') : inv.status === 'accepted' ? (AR ? 'مقبولة' : 'Accepted') : (AR ? 'مرفوضة' : 'Rejected')}`
- `101: variant={inv.status === 'pending' ? 'primary' : inv.status === 'accepted' ? 'success' : 'danger'}`
- `121: {inv.status === 'pending' && (`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
