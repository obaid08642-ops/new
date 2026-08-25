# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/provider_dashboard_insurance_static_audit_20260820.txt`
- **Member SHA-256:** `eceb3cf0bffb6b9cc09f60fc568cf6652583314c5a3b936c6b9b4aef2b354a16`
- **Line count:** 72
- **Read range:** `1-72`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `72: ===== shared/InsuranceRequestsScreen.tsx =====`
### backend_consumers_or_contracts
- `62: ===== radiology/RadiologyDashboard.tsx =====`
- `64: ===== pharmacy/PharmacyDashboard.tsx =====`
- `66: ===== nursing/NursingDashboard.tsx =====`
- `72: ===== shared/InsuranceRequestsScreen.tsx =====`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `8: 1155- {isVip && <NBadge label="VIP " variant="success" size="xs" />}`
- `11: 2843- const [exStart, setExStart] = useState('12:00');`
- `12: 2844- const [exEnd, setExEnd] = useState('14:00');`
- `14: 2846: const [insurances, setInsurances] = useState([`
- `27: 2896-      show(tr('تم حفظ جدول التوفر الأسبوعي', 'Weekly availability saved'), 'success');`
- `43: 3337: const [insurances, setInsurances] = useState([`
### payment_insurance_relevance
- `14: 2846: const [insurances, setInsurances] = useState([`
- `15: 2847:  { id: 'bupa', ar: 'بوبا العربية', en: 'Bupa Arabia', active: true, copay: '10', tier: 'VIP', clinic: true, online: false, home: false },`
- `16: 2848:  { id: 'tawuniya', ar: 'التعاونية للتأمين', en: 'Tawuniya', active: true, copay: '20', tier: 'Class A', clinic: true, online: true, home: false },`
- `17: 2849:  { id: 'medgulf', ar: 'ميدغلف', en: 'Medgulf', active: false, copay: '20', tier: 'Class B', clinic: true, online: false, home: false },`
- `18: 2850:  { id: 'malath', ar: 'ملاذ للتأمين', en: 'Malath Insurance', active: false, copay: '25', tier: 'Class C', clinic: false, online: false, home: false },`
- `26: 2895:      await client.post('/provider/settings/delta', { newData: { weeklySchedule, exceptions, insurances } });`
- `31: 2956- </NCard>`
- `33: 2958- {/* Insurance Config */}`
- `34: 2959: <NSecHeader title={tr('شركات التأمين المقبولة', 'Accepted Insurances')} />`
- `35: 2960: {insurances.map(item => (`
- `36: 2961-  <NCard key={item.id} style={{ marginBottom: SP.md }}>`
- `43: 3337: const [insurances, setInsurances] = useState([`
### error_empty_loading_retry_cancel
- `29: 2898-    } catch (e) {`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
