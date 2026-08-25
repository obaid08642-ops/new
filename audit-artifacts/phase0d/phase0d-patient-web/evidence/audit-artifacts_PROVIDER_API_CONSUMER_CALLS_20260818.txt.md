# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/PROVIDER_API_CONSUMER_CALLS_20260818.txt`
- **Member SHA-256:** `ef94caf34d55a58be91781c6ff32cad23159516c85d9c880a89ae1349890f7f3`
- **Line count:** 318
- **Read range:** `1-318`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `3: provider-app/src/api/provider.ts:30:    const res = await client.post('/auth/login', { phone, password });`
- `4: provider-app/src/api/provider.ts:59:      const res = await client.post('/storage/upload', {`
- `5: provider-app/src/api/provider.ts:75:    const res = await client.post('/storage/upload', {`
- `8: provider-app/src/api/provider.ts:99:    const res = await client.post('/provider-onboarding/submit', payload || {});`
- `11: provider-app/src/context/index.tsx:300:      const res = await fetch(`${baseUrl}/provider/auth/login`, {`
- `12: provider-app/src/context/index.tsx:360:        await fetch(`${API_BASE}/provider/auth/logout`, { method: 'POST', headers, body: JSON.stringify({ session_id: sessionId }) });`
- `14: provider-app/src/screens/ambulance/AmbulanceDashboard.tsx:42:      const res = await client.get('/emergency/driver/missions');`
- `15: provider-app/src/screens/ambulance/AmbulanceDashboard.tsx:63:      await client.post(`/emergency/${id}/claim`, {});`
- `16: provider-app/src/screens/ambulance/AmbulanceDashboard.tsx:177:        const res = await client.get(`/provider/ops/ambulance/${mission.id}/eta`, {`
- `17: provider-app/src/screens/ambulance/AmbulanceDashboard.tsx:194:        await client.post(`/emergency/${mission.id}/track`, { lat: pos.coords.latitude, lng: pos.coords.longitude });`
- `18: provider-app/src/screens/ambulance/AmbulanceDashboard.tsx:264:      await client.post(`/provider/ops/ambulance/${mission.id}/handover`, { hospital_name: hospital.trim(), notes: notes.trim() });`
- `19: provider-app/src/screens/ambulance/AmbulanceDashboard.tsx:316:      await client.post(`/provider/ops/ambulance/${mission.id}/complete`, {`
### backend_consumers_or_contracts
- `2: provider-app/src/api/provider.ts:24:    const res = await client.post('/provider-onboarding/start', payload);`
- `3: provider-app/src/api/provider.ts:30:    const res = await client.post('/auth/login', { phone, password });`
- `4: provider-app/src/api/provider.ts:59:      const res = await client.post('/storage/upload', {`
- `5: provider-app/src/api/provider.ts:75:    const res = await client.post('/storage/upload', {`
- `6: provider-app/src/api/provider.ts:87:    const res = await client.post('/provider-onboarding/step2', payload);`
- `7: provider-app/src/api/provider.ts:93:    const res = await client.post('/provider-onboarding/step3', payload);`
- `8: provider-app/src/api/provider.ts:99:    const res = await client.post('/provider-onboarding/submit', payload || {});`
- `9: provider-app/src/context/index.tsx:215:      const isOnline = await fetch('https://1.1.1.1', { method: 'HEAD' }).then(() => true).catch(() => false);`
- `10: provider-app/src/context/index.tsx:272:      const res = await fetch(`${baseUrl}/provider/auth/refresh`, {`
- `11: provider-app/src/context/index.tsx:300:      const res = await fetch(`${baseUrl}/provider/auth/login`, {`
- `12: provider-app/src/context/index.tsx:360:        await fetch(`${API_BASE}/provider/auth/logout`, { method: 'POST', headers, body: JSON.stringify({ session_id: sessionId }) });`
- `13: provider-app/src/context/index.tsx:385: const res = await fetch(`${API_BASE}/provider/ops/availability/toggle-instant`, {`
### auth_ownership
- `3: provider-app/src/api/provider.ts:30:    const res = await client.post('/auth/login', { phone, password });`
- `10: provider-app/src/context/index.tsx:272:      const res = await fetch(`${baseUrl}/provider/auth/refresh`, {`
- `11: provider-app/src/context/index.tsx:300:      const res = await fetch(`${baseUrl}/provider/auth/login`, {`
- `12: provider-app/src/context/index.tsx:360:        await fetch(`${API_BASE}/provider/auth/logout`, { method: 'POST', headers, body: JSON.stringify({ session_id: sessionId }) });`
- `25: provider-app/src/screens/auth/PendingDashboard.tsx:34:      await client.post('/auth/send-otp', { identifier: user.email });`
- `26: provider-app/src/screens/auth/PendingDashboard.tsx:47:      await client.post('/auth/verify-otp', { identifier: user.email, code: otp });`
- `50: provider-app/src/screens/doctor/DoctorDashboard.tsx:2899: const res = await client.get('/provider/capabilities/doctor-sessions');`
- `51: provider-app/src/screens/doctor/DoctorDashboard.tsx:2947: await client.post('/provider/capabilities/doctor-sessions', payload);`
- `52: provider-app/src/screens/doctor/DoctorDashboard.tsx:2975: await client.post('/provider/capabilities/doctor-sessions', payload);`
- `53: provider-app/src/screens/doctor/DoctorDashboard.tsx:2990: await client.delete(`/provider/capabilities/doctor-sessions/${id}`);`
- `54: provider-app/src/screens/doctor/DoctorDashboard.tsx:3015: await client.post('/provider/capabilities/doctor-sessions', payload);`
- `71: provider-app/src/screens/doctor/DoctorOpsScreens.tsx:289:      await client.delete(`/provider/ops/doctor/blacklist/${patientId}`);`
### state_transitions
- `25: provider-app/src/screens/auth/PendingDashboard.tsx:34:      await client.post('/auth/send-otp', { identifier: user.email });`
- `26: provider-app/src/screens/auth/PendingDashboard.tsx:47:      await client.post('/auth/verify-otp', { identifier: user.email, code: otp });`
- `27: provider-app/src/screens/doctor/DoctorDashboard.tsx:192:	const resIncoming = await client.get('/provider/jobs/queue?status=incoming&kind=consultation');`
- `28: provider-app/src/screens/doctor/DoctorDashboard.tsx:202: const resToday = await client.get('/provider/jobs/queue?status=active');`
- `33: provider-app/src/screens/doctor/DoctorDashboard.tsx:450: client.get('/provider/jobs/queue?status=active&kind=consultation')`
- `60: provider-app/src/screens/doctor/DoctorDashboard.tsx:4113:      await fetch(`${API_BASE}/calls/provider/no-show`, {`
- `83: provider-app/src/screens/facility/FacilityDashboard.tsx:263:   client.get('/provider/jobs/queue?status=active&kind=appointment&today=true').then(r => setTodayApts(r.data || [])).catch(() => {});`
- `86: provider-app/src/screens/facility/FacilityDashboard.tsx:272: client.get('/provider/jobs/queue?status=active&kind=appointment&today=true'),`
- `99: provider-app/src/screens/facility/FacilityDashboard.tsx:1341: useEffect(() => { client.get('/provider/jobs/queue?status=active&kind=appointment&today=true').then(r => setTodayApts(r.data || [])).catch(() => {}); }, []);`
- `124: provider-app/src/screens/facility/FacilityResourcesScreen.tsx:60:      await client.put(`/facility/resources/${res.id}`, { status: next });`
- `129: provider-app/src/screens/lab/LabDashboard.tsx:373:      await client.patch(`/labs/bookings/${order.id}/state`, { state: 'SAMPLE_REJECTED' });`
- `130: provider-app/src/screens/lab/LabDashboard.tsx:383:      await client.patch(`/labs/bookings/${order.id}/state`, { state: 'WAITING_COPAY', note: `nphies_code: ${nphiesCode}, copay: ${copay}` });`
### payment_insurance_relevance
- `2: provider-app/src/api/provider.ts:24:    const res = await client.post('/provider-onboarding/start', payload);`
- `6: provider-app/src/api/provider.ts:87:    const res = await client.post('/provider-onboarding/step2', payload);`
- `7: provider-app/src/api/provider.ts:93:    const res = await client.post('/provider-onboarding/step3', payload);`
- `8: provider-app/src/api/provider.ts:99:    const res = await client.post('/provider-onboarding/submit', payload || {});`
- `20: provider-app/src/screens/ambulance/AmbulanceDashboard.tsx:370:    client.get('/provider/ops/wallet/ledger?limit=50')`
- `32: provider-app/src/screens/doctor/DoctorDashboard.tsx:247:     await client.post(`/provider/jobs/consultation/${insuranceModalReq.id}/insurance`, {`
- `34: provider-app/src/screens/doctor/DoctorDashboard.tsx:659:      await client.post('/provider/consultation/end', payload);`
- `36: provider-app/src/screens/doctor/DoctorDashboard.tsx:938:  await client.post('/prescriptions/create', payload);`
- `40: provider-app/src/screens/doctor/DoctorDashboard.tsx:1841:        const res = await client.get('/provider/wallet');`
- `41: provider-app/src/screens/doctor/DoctorDashboard.tsx:1843:        const txRes = await client.get('/provider/wallet/transactions');`
- `46: provider-app/src/screens/doctor/DoctorDashboard.tsx:2336: await client.post(`/provider/jobs/consultation/${apt.id}/insurance`, {`
- `51: provider-app/src/screens/doctor/DoctorDashboard.tsx:2947: await client.post('/provider/capabilities/doctor-sessions', payload);`
### error_empty_loading_retry_cancel
- `9: provider-app/src/context/index.tsx:215:      const isOnline = await fetch('https://1.1.1.1', { method: 'HEAD' }).then(() => true).catch(() => false);`
- `25: provider-app/src/screens/auth/PendingDashboard.tsx:34:      await client.post('/auth/send-otp', { identifier: user.email });`
- `26: provider-app/src/screens/auth/PendingDashboard.tsx:47:      await client.post('/auth/verify-otp', { identifier: user.email, code: otp });`
- `83: provider-app/src/screens/facility/FacilityDashboard.tsx:263:   client.get('/provider/jobs/queue?status=active&kind=appointment&today=true').then(r => setTodayApts(r.data || [])).catch(() => {});`
- `84: provider-app/src/screens/facility/FacilityDashboard.tsx:264:   client.get('/hospital/staff').then(r => setSubaccounts(r.data || [])).catch(() => {});`
- `85: provider-app/src/screens/facility/FacilityDashboard.tsx:265:   client.get('/provider/stats/today').then(r => setTodayStats(r.data || null)).catch(() => {});`
- `93: provider-app/src/screens/facility/FacilityDashboard.tsx:1017: useEffect(() => { client.get('/provider/facility/shifts').then(r => setShifts(r.data || [])).catch(() => {}); }, []);`
- `99: provider-app/src/screens/facility/FacilityDashboard.tsx:1341: useEffect(() => { client.get('/provider/jobs/queue?status=active&kind=appointment&today=true').then(r => setTodayApts(r.data || [])).catch(() => {}); }, []);`
- `142: provider-app/src/screens/lab/LabDashboard.tsx:943: useEffect(() => { client.get('/labs/packages').then(r => setBundlesList(r.data || [])).catch(() => {}); }, []);`
- `166: provider-app/src/screens/nursing/NursingDashboard.tsx:510: useEffect(() => { client.get('/provider/nursing/checklist').then(r => setItems(r.data || [])).catch(() => {}); }, []);`
- `176: provider-app/src/screens/nursing/NursingDashboard.tsx:950: useEffect(() => { client.get('/provider/nursing/supplies').then(r => setSupplies(r.data || [])).catch(() => {}); }, []);`
- `204: provider-app/src/screens/pharmacy/PharmacyDashboard.tsx:771:        client.get('/provider/wallet/transactions').catch(() => ({ data: [] })),`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
