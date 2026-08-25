# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/family/calendar.tsx`
- **Member SHA-256:** `aa3821a40e010dfb9d35b3081d74f7d8d8ca37afbdfcc32fbd4ae640b981d6bf`
- **Line count:** 294
- **Read range:** `1-294`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `14: import { router } from "expo-router";`
- `38: export default function FamilyCalendarScreen() {`
- `78: const submitEvent = async () => {`
- `98: { text: "إلغاء", style: "cancel" },`
- `102: onPress: async () => {`
- `152: <IconButton icon="back" onPress={() => router.back()} />`
- `170: onPress={handleAddEvent}`
- `179: <Button label="إعادة المحاولة" variant="outline" size="sm" full={false} onPress={loadCalendarEvents} />`
- `244: onPress={() => handleDeleteEvent(e.id)}`
- `259: <View style={st.choiceWrap}>{members.map((member) => <TouchableOpacity key={member.user_id} accessibilityRole="button" onPress={() => setMemberUserId(member.user_id)} style={[st.choice, { borderColor: colors.border }, memberUserId === membe`
- `261: <View style={st.choiceWrap}>{([{ key: 'appointment', label: 'موعد' }, { key: 'reminder', label: 'تذكير' }, { key: 'medication', label: 'دواء' }, { key: 'lab', label: 'تحليل' }] as const).map((option) => <TouchableOpacity key={option.key} ac`
- `263: <View style={st.modalActions}><Button label="إلغاء" variant="ghost" size="sm" full={false} onPress={() => setFormOpen(false)} /><Button label="إضافة الحدث" size="sm" full={false} loading={adding} onPress={() => void submitEvent()} /></View>`
### backend_consumers_or_contracts
- `61: const [calendar, groupMembers] = await Promise.all([apiFetch("/family/calendar"), apiFetch("/family/members")]);`
- `82: await apiFetch("/family/calendar/event", { method: "POST", body: JSON.stringify(payload) });`
- `105: await apiFetch(`/family/calendar/event/${id}`, {`
### auth_ownership
- `259: <View style={st.choiceWrap}>{members.map((member) => <TouchableOpacity key={member.user_id} accessibilityRole="button" onPress={() => setMemberUserId(member.user_id)} style={[st.choice, { borderColor: colors.border }, memberUserId === membe`
- `261: <View style={st.choiceWrap}>{([{ key: 'appointment', label: 'موعد' }, { key: 'reminder', label: 'تذكير' }, { key: 'medication', label: 'دواء' }, { key: 'lab', label: 'تحليل' }] as const).map((option) => <TouchableOpacity key={option.key} ac`
### state_transitions
- `3: import React, { useState, useEffect } from "react";`
- `8: StatusBar,`
- `41: const [events, setEvents] = useState<any[]>([]);`
- `42: const [members, setMembers] = useState<any[]>([]);`
- `43: const [loading, setLoading] = useState(true);`
- `44: const [loadError, setLoadError] = useState(false);`
- `45: const [adding, setAdding] = useState(false);`
- `46: const [formOpen, setFormOpen] = useState(false);`
- `47: const [title, setTitle] = useState('');`
- `48: const [eventDate, setEventDate] = useState('');`
- `49: const [memberUserId, setMemberUserId] = useState<string | null>(null);`
- `50: const [eventType, setEventType] = useState<FamilyCalendarEventType | null>(null);`
### payment_insurance_relevance
- `20: Card,`
- `29: import { buildFamilyCalendarPayload, parseFamilyCalendarEvents, type FamilyCalendarEventType } from '../../src/utils/family-calendar-contract';`
- `80: const payload = buildFamilyCalendarPayload({ title, eventDate, memberUserId, type: eventType });`
- `82: await apiFetch("/family/calendar/event", { method: "POST", body: JSON.stringify(payload) });`
- `176: <Card style={{ alignItems: "center", gap: 10 }}>`
- `180: </Card>`
- `199: <Card`
- `246: </Card>`
- `253: <View style={[st.modalCard, { backgroundColor: colors.surface }]}>`
- `289: modalCard: { borderRadius: 22, padding: 18, gap: 11 },`
### error_empty_loading_retry_cancel
- `43: const [loading, setLoading] = useState(true);`
- `44: const [loadError, setLoadError] = useState(false);`
- `51: const [formError, setFormError] = useState('');`
- `59: setLoading(true);`
- `60: setLoadError(false);`
- `64: } catch (err) {`
- `65: console.error(err);`
- `68: setLoadError(true);`
- `70: setLoading(false);`
- `75: setTitle(''); setEventDate(''); setMemberUserId(null); setEventType(null); setFormError(''); setFormOpen(true);`
- `81: setAdding(true); setFormError('');`
- `85: } catch (err: any) {`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
