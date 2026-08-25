# Phase 0D semantic evidence

- **Surface:** Provider
- **Archive:** `NabdProvider-provider.zip`
- **Member path:** `src/screens/ambulance/AmbulanceDashboard.tsx`
- **Member SHA-256:** `f678b853dbacc4d9173ebebaf2b70439ef26e6d89aab136e736f93bc7b7ade4e`
- **Line count:** 461
- **Read range:** `1-461`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `3: * Screens: Home (SOS pool + missions) · ActiveMission (ETA+GPS) · Handover ·`
- `21: import { FleetScreen } from '../shared/FleetScreen';`
- `26: function AmbulanceHomeScreen({ onNavigate }: { onNavigate: (s: string, p?: any) => void }) {`
- `90: <TouchableOpacity key={m.id} onPress={() => onNavigate('mission', { id: m.id })}>`
- `137: onPress={() => claim(m.id)}`
- `144: <TouchableOpacity onPress={() => onNavigate('fleet')}>`
- `149: <TouchableOpacity onPress={() => onNavigate('history')}>`
- `160: function ActiveMissionScreen({ mission, onBack, onNavigate }: { mission: any; onBack: () => void; onNavigate: (s: string, p?: any) => void }) {`
- `232: onPress={() => setTracking(!tracking)}`
- `237: onPress={() => onNavigate('handover', mission)}`
- `243: onPress={() => onNavigate('complete', mission)}`
- `251: function HandoverScreen({ mission, onBack }: { mission: any; onBack: () => void }) {`
### backend_consumers_or_contracts
- `20: import client from '../../api/client';`
- `370: client.get('/provider/ops/wallet/ledger?limit=50')`
### auth_ownership
- `9: ActivityIndicator, RefreshControl,`
- `37: const [refreshing, setRefreshing] = useState(false);`
- `58: const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };`
- `83: <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.danger} />}`
- `117: subtitle={AR ? 'ابقَ متصلاً — تصلك النداءات فورياً كل 15 ثانية' : 'Stay online — calls refresh every 15s'}`
- `174: const { status } = await Location.requestForegroundPermissionsAsync();`
- `425: export function AmbulanceDashboardNavigator({ onLogout }: { onLogout: () => void }) {`
### state_transitions
- `6: import React, { useState, useEffect, useCallback, useRef } from 'react';`
- `17: NSecHeader, NOnlineToggle, NEmpty,`
- `34: const [pool, setPool] = useState<any[]>([]);`
- `35: const [mine, setMine] = useState<any[]>([]);`
- `36: const [loading, setLoading] = useState(true);`
- `37: const [refreshing, setRefreshing] = useState(false);`
- `38: const [claiming, setClaiming] = useState<string | null>(null);`
- `48: setLoading(false);`
- `64: show(AR ? 'تم قبول المهمة — انطلق' : 'Mission claimed — go!', 'success');`
- `70: : (AR ? 'تعذر قبول المهمة' : 'Could not claim mission'), 'error');`
- `101: {m.symptoms || ''} · {m.state}`
- `113: {loading && <ActivityIndicator color={theme.danger} style={{ marginTop: SP.xl }} />}`
### payment_insurance_relevance
- `16: NBtn, NCard, NAvatar, NBadge, NHeader, NScroll, NInput,`
- `91: <NCard style={{ marginBottom: SP.md, borderLeftWidth: 4, borderLeftColor: theme.danger }}>`
- `106: </NCard>`
- `121: <NCard key={m.id} style={{ marginBottom: SP.md }}>`
- `141: </NCard>`
- `145: <NCard style={{ marginTop: SP.md, alignItems: 'center' }}>`
- `147: </NCard>`
- `150: <NCard style={{ marginTop: SP.md, alignItems: 'center' }}>`
- `152: </NCard>`
- `204: <NCard style={{ backgroundColor: theme.danger + '12', alignItems: 'center', padding: SP.xl, marginBottom: SP.lg }}>`
- `212: </NCard>`
- `214: <NCard style={{ marginBottom: SP.lg }}>`
### error_empty_loading_retry_cancel
- `17: NSecHeader, NOnlineToggle, NEmpty,`
- `36: const [loading, setLoading] = useState(true);`
- `45: } catch {`
- `48: setLoading(false);`
- `67: } catch (e: any) {`
- `70: : (AR ? 'تعذر قبول المهمة' : 'Could not claim mission'), 'error');`
- `113: {loading && <ActivityIndicator color={theme.danger} style={{ marginTop: SP.xl }} />}`
- `114: {!loading && pool.length === 0 && (`
- `115: <NEmpty`
- `136: size="sm" full={false} loading={claiming === m.id}`
- `181: } catch {`
- `195: } catch { /* best-effort tracking */ }`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
