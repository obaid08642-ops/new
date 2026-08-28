const fs = require('node:fs');
const path = require('node:path');

describe('Provider App release contracts', () => {
  const root = process.cwd();
  const read = file => fs.readFileSync(path.join(root, 'src', file), 'utf8');
  const dashboard = read('screens/doctor/DoctorDashboard.tsx');
  const pharmacyDashboard = read('screens/pharmacy/PharmacyDashboard.tsx');
  const labDashboard = read('screens/lab/LabDashboard.tsx');
  const radiologyDashboard = read('screens/radiology/RadiologyDashboard.tsx');
  const facilityDashboard = read('screens/facility/FacilityDashboard.tsx');
  const nursingDashboard = read('screens/nursing/NursingDashboard.tsx');
  const nursingFieldOps = read('screens/nursing/NursingFieldOps.tsx');
  const ambulanceDashboard = read('screens/ambulance/AmbulanceDashboard.tsx');
  const sharedBlueprint = read('screens/shared/BlueprintScreens.tsx');
  const sharedScreens = read('screens/shared/SharedScreens.tsx');
  const app = fs.readFileSync(path.join(root, 'App.tsx'), 'utf8');
  const authContext = read('context/index.tsx');
  const platformMapWeb = read('components/PlatformMap.web.tsx');
  const registrations = [
    'doctor/DoctorRegistration.tsx',
    'pharmacy/PharmacyRegistration.tsx',
    'lab/LabRegistration.tsx',
    'radiology/RadiologyRegistration.tsx',
    'nursing/NursingRegistration.tsx',
  ].map(file => read(`screens/${file}`)).join('\n');
  const config = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8')).expo;

  it('has explicit production API and native platform identifiers', () => {
    expect(config.extra.apiBaseUrl).toBe('https://api.nabd.plus/api/v1');
    expect(config.android.package).toBe('com.nabd.plus.provider');
    expect(config.ios.bundleIdentifier).toBe('com.nabd.plus.provider');
    expect(config.userInterfaceStyle).toBe('automatic');
  });

  it('does not fabricate patient identity or financial values in intake mapping', () => {
    expect(dashboard).not.toContain('test_patient');
    expect(dashboard).not.toContain("national_id || '1029384756'");
    expect(dashboard).not.toContain("dob || '1980-05-12'");
    expect(dashboard).not.toMatch(/price\s*:\s*x\.total\s*\|\|\s*150/);
    expect(dashboard).toContain('const patientId = apt?.patient_id');
  });

  it('contains real doctor intake, reports, referral, CRM, and availability endpoints', () => {
    expect(dashboard).toContain('/provider/jobs/queue?status=incoming&kind=consultation');
    expect(dashboard).toContain('/provider/jobs/');
    expect(dashboard).toContain('/provider/stats/today');
    expect(dashboard).toContain('/provider/reports/inbound');
    expect(dashboard).toContain('/provider/referrals/mine');
    expect(dashboard).toContain('/provider/profile/availability');
    expect(dashboard).toContain('fetchQueue();');
    expect(dashboard).not.toContain("'guest_patient'");
    expect(dashboard).not.toContain("patient_id: apt?.patient_id || 'test'");
    expect(dashboard).not.toContain("Sick leave issued successfully', 'success');\n     setIssued(true);");
    expect(dashboard).toContain('server verifies appointment relation, doctor licence, legal signature');
  });

  it('uses server-backed pharmacy broadcasts and a native barcode scanner', () => {
    expect(pharmacyDashboard).not.toContain('Simulate Drug Scan');
    expect(pharmacyDashboard).not.toContain('طلب وصفة #B-9901');
    expect(pharmacyDashboard).toContain("client.get('/provider/pharmacy/broadcasts')");
    expect(pharmacyDashboard).toContain('/provider/pharmacy/broadcasts/${orderId}/offers/draft');
    expect(pharmacyDashboard).toContain('/provider/pharmacy/broadcasts/${orderId}/offers/${offerId}/submit');
    expect(pharmacyDashboard).toContain('/provider/pharmacy/broadcasts/${rejectOrderId}/reject');
    expect(pharmacyDashboard).not.toContain('/provider/pharmacy/orders/${orderId}/accept');
    expect(pharmacyDashboard).not.toContain('/provider/pharmacy/broadcasts/${orderId}/i-have-all');
    expect(pharmacyDashboard).not.toContain('/provider/pharmacy/broadcasts/${orderId}/i-have-partial');
    expect(pharmacyDashboard).toContain('the order is not assigned yet');
    expect(pharmacyDashboard).toContain("client.get('/provider/inventory/search', { params: { barcode: String(data) } })");
    expect(pharmacyDashboard).not.toContain('/pharmacy/orders/${rejectOrderId}/reject');
    expect(pharmacyDashboard).not.toMatch(/const\s+CHATS\s*=\s*\[/);
    expect(pharmacyDashboard).not.toContain('/pharmacy/prescriptions/');
    expect(pharmacyDashboard).not.toContain('/pharmacy/reports/eod');
    expect(pharmacyDashboard).not.toContain('/provider/wallet');
    expect(pharmacyDashboard).not.toContain('/provider/pharmacy/allocations/${alloc.id}/delivered');
    expect(pharmacyDashboard).toContain('This function is currently unavailable');
    expect(pharmacyDashboard).toContain('المحادثات الصيدلانية ليست مفعلة');
    expect(pharmacyDashboard).toContain('No mutation or settlement was performed');
    expect(pharmacyDashboard).toContain("client.get('/provider/pharmacy/allocations', { params: { status: 'completed' } })");
  });

  it('uses structured lab data and private radiology uploads rather than terminal placeholders', () => {
    expect(labDashboard).not.toContain('const RESULTS =');
    expect(labDashboard).toContain('/labs/bookings/${order.id}/coverage-decision');
    expect(labDashboard).not.toContain("state: 'WAITING_COPAY'");
    expect(labDashboard).not.toContain("state: 'CONFIRMED'");
    expect(radiologyDashboard).toContain('/radiology/bookings/${currentOrder.id}/coverage-decision');
    expect(radiologyDashboard).not.toContain("state:'CONFIRMED'");
    expect(labDashboard).toContain('/labs/bookings/${sample.lab_order_id || sample.id}/upload-report');
    expect(radiologyDashboard).not.toContain('Coming with S3 integration');
    expect(radiologyDashboard).not.toContain("'https://storage.nabdah.com/reports/' + order.id + '.pdf'");
    expect(radiologyDashboard).not.toContain('HTTPS URL for the signed PDF report');
    expect(radiologyDashboard).toContain('DocumentPicker.getDocumentAsync');
    expect(radiologyDashboard).toContain('ProviderApi.uploadFile');
    expect(radiologyDashboard).toContain('/radiology/bookings/${order.id}/upload-report');
  });

  it('requires an approved bank account and an idempotency key for provider withdrawals', () => {
    expect(sharedScreens).toContain("bank?.review_status === 'approved'");
    expect(sharedScreens).toContain('Crypto.randomUUID()');
    expect(sharedScreens).toContain('idempotency_key');
    expect(sharedScreens).not.toContain("client.post('/provider/payouts/request', { amount: amt, iban: cleanIban });");
  });

  it('connects shared referral, promotions, profile, and facility flows to governed APIs', () => {
    expect(sharedBlueprint).toContain('/provider/referral-network');
    expect(sharedBlueprint).toContain('/provider/referrals');
    expect(sharedBlueprint).toContain('/provider/promotions');
    expect(sharedBlueprint).toContain("client.get('/provider/profile')");
    expect(sharedBlueprint).toContain("client.patch('/provider/profile'");
    expect(sharedBlueprint).not.toContain('/provider/features/');
    expect(facilityDashboard).toContain("client.get('/facility/shifts')");
    expect(app).toContain('AmbulanceDashboardNavigator');
  });

  it('uses server-backed availability rather than a locally online provider or pharmacy', () => {
    expect(authContext).toContain('isOnline: false');
    expect(pharmacyDashboard).toContain('const { user, toggleOnline } = useAuth();');
    expect(pharmacyDashboard).not.toContain('const [isOnline, setIsOnline] = useState(true);');
  });

  it('does not mark cash collection or begin a consultation in the doctor UI without a server mutation', () => {
    expect(dashboard).not.toContain('Payment locked. Starting consultation.');
    expect(dashboard).not.toContain('تم قفل حالة الدفع وبدء الاستشارة');
    expect(dashboard).not.toContain('Video Call Connected...');
    expect(dashboard).not.toContain("sender: 'patient', time: '10:00'");
    expect(dashboard).toContain('Consultation session is currently unavailable');
    expect(dashboard).toContain('setError(true);');
  });

  it('fails closed for ungoverned nursing field operations and unavailable ambulance missions', () => {
    expect(nursingDashboard).not.toContain('/home-care/bookings/${order.id}/respond');
    expect(nursingDashboard).not.toContain('Cash only — no insurance');
    expect(nursingFieldOps).toContain('Field operations are currently unavailable');
    expect(nursingFieldOps).not.toContain("lat: 24.71, lng: 46.67");
    expect(ambulanceDashboard).not.toContain('setMission({ id })');
    expect(ambulanceDashboard).toContain('hospital_provider_account_id');
  });

  it('isolates native maps behind a web-safe component', () => {
    expect(registrations).not.toContain("from 'react-native-maps'");
    expect(registrations).toContain('PlatformMap');
    expect(platformMapWeb).toContain('Interactive map is available in the native app.');
  });

  it('does not seed provider registration with commercial or geographic values', () => {
    expect(registrations).not.toMatch(/clinicPrice:'300'|homePrice:'500'|videoPrice:'200'/);
    expect(registrations).not.toMatch(/priceVisit: '150'|priceHour: '80'|priceDay: '800'|priceMonth: '8000'/);
    expect(registrations).not.toContain('lat: 24.7136');
    expect(registrations).not.toContain('lng: 46.6753');
    expect(registrations).not.toContain("cashOnly: true");
  });
});
