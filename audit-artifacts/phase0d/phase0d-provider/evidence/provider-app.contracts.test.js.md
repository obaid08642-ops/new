# Phase 0D semantic evidence

- **Surface:** Provider
- **Archive:** `NabdProvider-provider.zip`
- **Member path:** `provider-app.contracts.test.js`
- **Member SHA-256:** `6b140be9a95038301fbff37a171012c7f16f5f1abd6de83f44d03d60dd40b99c`
- **Line count:** 80
- **Read range:** `1-80`
- **Classification:** `OWNED_TEST`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `6: const dashboard = fs.readFileSync(path.join(root, 'src/screens/doctor/DoctorDashboard.tsx'), 'utf8');`
- `7: const pharmacyDashboard = fs.readFileSync(path.join(root, 'src/screens/pharmacy/PharmacyDashboard.tsx'), 'utf8');`
- `8: const radiologyDashboard = fs.readFileSync(path.join(root, 'src/screens/radiology/RadiologyDashboard.tsx'), 'utf8');`
- `17: ].map(file => fs.readFileSync(path.join(root, 'src/screens', file), 'utf8')).join('\n');`
### backend_consumers_or_contracts
- `7: const pharmacyDashboard = fs.readFileSync(path.join(root, 'src/screens/pharmacy/PharmacyDashboard.tsx'), 'utf8');`
- `8: const radiologyDashboard = fs.readFileSync(path.join(root, 'src/screens/radiology/RadiologyDashboard.tsx'), 'utf8');`
- `13: 'pharmacy/PharmacyRegistration.tsx',`
- `15: 'radiology/RadiologyRegistration.tsx',`
- `16: 'nursing/NursingRegistration.tsx',`
- `21: expect(config.extra.apiBaseUrl).toBe('https://api.nabd.plus/api/v1');`
- `42: it('does not ship fake pharmacy/radiology terminal actions', () => {`
- `45: expect(pharmacyDashboard).toContain("client.get('/provider/pharmacy/broadcasts')");`
- `46: expect(pharmacyDashboard).toContain('/provider/pharmacy/orders/${orderId}/accept');`
- `47: expect(pharmacyDashboard).toContain('/provider/pharmacy/broadcasts/${rejectOrderId}/reject');`
- `48: expect(pharmacyDashboard).not.toContain('/pharmacy/orders/${rejectOrderId}/reject');`
- `49: expect(pharmacyDashboard).toContain("client.get('/provider/pharmacy/allocations', { params: { status: 'completed' } })");`
### auth_ownership
- `32: expect(dashboard).toContain('const patientId = apt?.patient_id');`
- `35: it('contains real provider intake actions and refreshes after mutations', () => {`
### state_transitions
- `36: expect(dashboard).toContain('/provider/jobs/queue?status=incoming&kind=consultation');`
- `49: expect(pharmacyDashboard).toContain("client.get('/provider/pharmacy/allocations', { params: { status: 'completed' } })");`
- `58: expect(pharmacyDashboard).not.toContain('const [isOnline, setIsOnline] = useState(true);');`
- `64: expect(dashboard).toContain('setError(true);');`
### payment_insurance_relevance
- `31: expect(dashboard).not.toMatch(/price\s*:\s*x\.total\s*\|\|\s*150/);`
- `61: it('does not mark cash collection or begin a consultation in the doctor UI without a server mutation', () => {`
- `62: expect(dashboard).not.toContain('Payment locked. Starting consultation.');`
- `74: expect(registrations).not.toMatch(/clinicPrice:'300'|homePrice:'500'|videoPrice:'200'/);`
- `75: expect(registrations).not.toMatch(/priceVisit: '150'|priceHour: '80'|priceDay: '800'|priceMonth: '8000'/);`
- `78: expect(registrations).not.toContain("cashOnly: true");`
### error_empty_loading_retry_cancel
- `64: expect(dashboard).toContain('setError(true);');`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
