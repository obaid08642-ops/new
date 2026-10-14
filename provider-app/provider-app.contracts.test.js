const fs = require('node:fs');
const path = require('node:path');

describe('Provider App release contracts', () => {
  const root = process.cwd();
  const read = file => fs.readFileSync(path.join(root, 'src', file), 'utf8');
  // F51: split dashboards are barrels — read the whole split directory instead.
  const readSplit = dir => fs.readdirSync(path.join(root, 'src', dir))
    .filter(f => f.endsWith('.tsx') || f.endsWith('.ts'))
    .sort()
    .map(f => fs.readFileSync(path.join(root, 'src', dir, f), 'utf8'))
    .join('\n');
  const dashboard = readSplit('screens/doctor/doctor');
  const pharmacyDashboard = read('screens/pharmacy/PharmacyDashboard.tsx');
  const labDashboard = read('screens/lab/LabDashboard.tsx');
  const radiologyDashboard = read('screens/radiology/RadiologyDashboard.tsx');
  const facilityDashboard = readSplit('screens/facility/facility');
  const nursingDashboard = read('screens/nursing/NursingDashboard.tsx');
  const nursingFieldOps = read('screens/nursing/NursingFieldOps.tsx');
  const sharedBlueprint = readSplit('screens/shared/blueprint');
  const sharedScreens = readSplit('screens/shared/shared');
  const app = fs.readFileSync(path.join(root, 'App.tsx'), 'utf8');
  const authContext = read('context/index.tsx');
  const platformMapWeb = read('components/PlatformMap.web.tsx');
  const registrations = [
    'doctor/DoctorRegistration.tsx',
    'pharmacy/PharmacyRegistration.tsx',
    'lab/LabRegistration.tsx',
    'nursing/NursingRegistration.tsx',
  ].map(file => read(`screens/${file}`)).join('\n');
  const config = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8')).expo;

  it('has explicit production API and native platform identifiers', () => {
    expect(config.extra.apiBaseUrl).toBe('https://api.nabd.plus/api/v1');
    expect(config.android.package).toBe('com.nabd.provider');
    expect(config.ios.bundleIdentifier).toBe('com.nabd.provider');
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
    // Pharmacy chat is server-backed (governed threads), not a disabled stub:
    // negotiation goes through /pharmacy/chat/threads with server decisions.
    expect(pharmacyDashboard).toContain("client.get('/pharmacy/chat/threads'");
    // M6: one Orders screen over all allocations; history is the "done" section (delivered/cancelled/rejected/expired),
    // not the non-existent allocation status "completed".
    expect(pharmacyDashboard).toContain("client.get('/provider/pharmacy/allocations')");
    expect(pharmacyDashboard).toContain("done: ['delivered', 'cancelled', 'rejected', 'expired']");
    expect(pharmacyDashboard).not.toContain("status: 'completed'");
  });

  it('uses structured lab data and private radiology uploads rather than terminal placeholders', () => {
    expect(labDashboard).not.toContain('const RESULTS =');
    expect(labDashboard).toContain('/labs/bookings/${order.id}/coverage-decision');
    expect(labDashboard).not.toContain("state: 'WAITING_COPAY'");
    // Insurance goes through coverage-decision; a direct CONFIRMED is only the cash/paid acceptance
    // (the server refuses it for insurance and unpaid card bookings: labs.service assertConfirmable).
    const confirms = labDashboard.split("state: 'CONFIRMED'").length - 1;
    expect(confirms).toBe(1);
    const start = labDashboard.indexOf('const handleCashConfirm');
    expect(start).toBeGreaterThan(-1);
    // the one CONFIRMED patch sits inside handleCashConfirm (no other handler between them)
    expect(labDashboard.slice(start + 1, labDashboard.indexOf("state: 'CONFIRMED'"))).not.toContain('const handle');
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
    // M8: one profile editor (shared/shared/ProviderProfileEditor) for the profile, location and public-page sections
    expect(sharedScreens).toContain("client.get('/provider/profile')");
    expect(sharedScreens).toContain("client.patch('/provider/profile'");
    expect(sharedBlueprint).not.toContain('/provider/features/');
    expect(facilityDashboard).toContain("client.get('/facility/shifts')");
    // decision 14: the ambulance provider type is gone from the app
    expect(app).not.toContain('Ambulance');
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
    // The visit moves only through server mutations on a server-verified appointment
    // (LiveConsultationScreen loads it first; check-in / start / finish are PATCH/POST calls).
    expect(dashboard).toContain("client.get(`/care/appointments/${encodeURIComponent(aptId)}`)");
    expect(dashboard).toContain('client.patch(`/care/appointments/${aptId}/start`');
    expect(dashboard).toContain('client.post(`/care/appointments/${aptId}/finish`');
    expect(dashboard).toContain('setError(true);');
  });

  it('fails closed for ungoverned nursing field operations', () => {
    expect(nursingDashboard).not.toContain('/home-care/bookings/${order.id}/respond');
    expect(nursingDashboard).not.toContain('Cash only — no insurance');
    // Field ops run only through verified server commands (no local
    // simulation): visit lifecycle via POST /nursing/visits/:id/* with real
    // device GPS and captured signature.
    expect(nursingFieldOps).toContain('/nursing/visits/${visitId}');
    expect(nursingFieldOps).toContain("import('expo-location')");
    expect(nursingFieldOps).not.toContain("lat: 24.71, lng: 46.67");
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

  it('API client sends an idempotency key on every mutation (routes with @RequireIdempotency reject calls without one)', () => {
    const client = read('api/client.ts');
    expect(client).toMatch(/\['POST', 'PUT', 'PATCH', 'DELETE'\]\.includes\(method\)/);
    expect(client).toMatch(/h\['Idempotency-Key'\] = `prov-\$\{await CryptoUtils\.randomHex\(16\)\}`/);
  });

  it('registration wizards sign in as the onboarding identity (a provider account exists only after submit + review)', () => {
    // M9: one shared helper creates the identity and signs in as it; every type's first step goes through it.
    const all = ['doctor/DoctorRegistration.tsx', 'pharmacy/PharmacyRegistration.tsx', 'lab/LabRegistration.tsx',
      'nursing/NursingRegistration.tsx', 'facility/FacilityRegistration.tsx'];
    for (const file of all) {
      const src = read(`screens/${file}`);
      expect(src).toMatch(/startOnboardingAccount\(\{[\s\S]*?password: data\.password/);
      expect(src).not.toMatch(/ProviderApi\.login\(/);
    }
    const kit = read('screens/registration/kit.ts');
    expect(kit).toMatch(/ProviderApi\.onboardingLogin\(params\.email, params\.password, loginType\)/);
    expect(kit).not.toMatch(/ProviderApi\.login\(/);
    expect(read('api/provider.ts')).toMatch(/onboardingLogin[\s\S]*client\.post\('\/auth\/login'/);
  });

  it('withdrawal is reachable in every wallet role and payouts use the server state (E1, E2, E3)', () => {
    for (const src of [pharmacyDashboard, labDashboard, radiologyDashboard, facilityDashboard, nursingDashboard, dashboard]) {
      expect(src).toContain('name="withdrawal_workflow"');
    }
    expect(sharedScreens).toContain("client.get('/provider/payouts/balance')");
    expect(sharedScreens).toContain('lifetime_earned');
    expect(sharedScreens).toContain('h.rejection_reason');
    expect(sharedScreens).toContain("'PENDING_ADMIN_APPROVAL'");
    expect(sharedScreens).not.toContain('h.admin_note');
    expect(sharedScreens).not.toContain("h.status === 'pending'");
  });

  it('pharmacy More menu rows all open registered routes; qr_menu/pharmacy_info are one route; wallet wrapper removed (P1, M2, M5)', () => {
    const more = read('screens/pharmacy/PharmacyMore.tsx');
    const registered = new Set([...pharmacyDashboard.matchAll(/<Stack\.Screen name="([a-z_]+)"/g)].map(m => m[1]));
    const routes = [...more.matchAll(/route: '([a-z_]+)'/g)].map(m => m[1]);
    expect(routes.length).toBeGreaterThan(30);
    expect(routes.filter(r => !registered.has(r))).toEqual([]);
    expect(pharmacyDashboard).not.toContain('name="pharmacy_info"');
    expect(pharmacyDashboard).not.toContain('function PharmacyWalletScreen');
    expect(pharmacyDashboard).toContain('<ProviderWalletScreen');
  });

  describe('build slice 2: merges, flows and removal', () => {
    const exists = rel => fs.existsSync(path.join(root, 'src', rel));
    const doctorNavigator = read('screens/doctor/doctor/DoctorDashboardNavigator.tsx');
    const facilityNavigator = read('screens/facility/facility/FacilityDashboardNavigator.tsx');
    const registered = src => new Set([...src.matchAll(/<Stack\.Screen name="([a-zA-Z0-9_]+)"/g)].map(m => m[1]));

    it('M1 one CertificatesConfigScreen; the booking chat and inbound reports have their own files', () => {
      expect(exists('screens/doctor/doctor/CertificatesConfigScreen.tsx')).toBe(false);
      expect(exists('screens/doctor/doctor/PreVisitChatScreen.tsx')).toBe(true);
      expect(exists('screens/doctor/doctor/InboundMedicalReportsScreen.tsx')).toBe(true);
      expect(doctorNavigator).toMatch(/import \{ CertificatesConfigScreen[^}]*\} from '\.\.\/\.\.\/shared\/SharedScreens'/);
      for (const r of ['certificates_config', 'pre_visit_chat', 'inbound_reports']) expect(registered(doctorNavigator).has(r)).toBe(true);
    });

    it('M3 the doctor Wallet tab renders the shared wallet; M4 every revenue route renders RevenueInsights', () => {
      expect(exists('screens/doctor/doctor/DoctorWalletTab.tsx')).toBe(false);
      expect(doctorNavigator).toContain('<ProviderWalletScreen embedded');
      expect(exists('screens/facility/facility/FacilityFinancialScreen.tsx')).toBe(false);
      for (const r of ['financial', 'auto_reports', 'revenue_insights']) {
        expect(facilityNavigator).toMatch(new RegExp(`name="${r}">[^\\n]*<RevenueInsights role="facility"`));
      }
    });

    it('M7 radiology home and orders tab read one inbox hook', () => {
      expect((radiologyDashboard.match(/= useRadiologyInbox\(\)/g) || []).length).toBe(2);
      expect((radiologyDashboard.match(/client\.get\('\/radiology\/provider\/inbox'\)/g) || []).length).toBe(1);
    });

    it('M8 one profile editor: profile, location and public page are sections of it', () => {
      for (const f of ['screens/doctor/doctor/DoctorProfileEditScreen.tsx', 'screens/doctor/doctor/DoctorLocationScreen.tsx', 'screens/shared/blueprint/ProfileWebConfig.tsx']) {
        expect(exists(f)).toBe(false);
      }
      expect(nursingDashboard).not.toContain('function NursingProfileEditScreen');
      expect(doctorNavigator).toContain('name="profile_edit">{({ navigation }: any) => <ProviderProfileEditor role="doctor"');
      expect(doctorNavigator).toContain('initialSection="location"');
      expect(nursingDashboard).toContain('<ProviderProfileEditor role="nursing"');
      expect(sharedScreens).toContain("client.patch('/provider/profile', patch)");
    });

    it('D2 the doctor keeps the post-visit tools after Finish and prescribes only while IN_PROGRESS', () => {
      const live = read('screens/doctor/doctor/LiveConsultationScreen.tsx');
      expect(live).toContain("'IN_PROGRESS', 'COMPLETED'");
      expect(live).toContain("const canPrescribe = status === 'IN_PROGRESS'");
      expect(live).toContain('disabled={!canPrescribe}');
      expect(read('screens/doctor/doctor/EPrescriptionScreen.tsx')).toMatch(/in-progress appointment/);
    });

    it('N2 every nursing entry point opens the single /nursing/visits flow', () => {
      const names = registered(nursingDashboard);
      expect(names.has('order_detail')).toBe(true);
      expect(names.has('checkin')).toBe(false);
      expect(names.has('visit_report')).toBe(false);
      expect(nursingDashboard).not.toMatch(/onNav\('(checkin|visit_report)'/);
      expect(nursingDashboard).not.toMatch(/screen:'(checkin|visit_report)'/);
      expect(nursingFieldOps).not.toContain("act('respond'");
      expect(nursingFieldOps).toContain('/provider/jobs/nursing/${visitId}/${kind}');
      expect(nursingFieldOps).toContain("act('transit'");
      expect(nursingFieldOps).toContain("act('start-care'");
      expect(nursingFieldOps).toContain("act('complete'");
      // every screen the dashboard navigates to by name is registered (tabs excluded)
      const tabs = new Set(['home', 'orders', 'jobs', 'drugs', 'settings']);
      const targets = [...nursingDashboard.matchAll(/\bon(?:Nav|Navigate)\('([a-z_0-9]+)'/g)].map(m => m[1]).filter(n => !tabs.has(n));
      const quick = [...nursingDashboard.matchAll(/screen:'([a-z_0-9]+)'/g)].map(m => m[1]);
      for (const t of [...targets, ...quick]) expect({ t, ok: names.has(t) }).toEqual({ t, ok: true });
    });

    it('A1/A2 not-approved states keep the provider on the status screen with a reason and a refresh', () => {
      expect(authContext).toContain('mapAccountStatus(status)');
      expect(authContext).toContain("'needs_changes'");
      expect(app).toContain("appState === 'needs_changes'");
      expect(app).toContain('status={blocked}');
      const pending = read('screens/auth/PendingDashboard.tsx');
      expect(pending).toContain("client.get('/provider-onboarding/my-profile')");
      expect(pending).toContain("client.get('/provider-onboarding/progress')");
      expect(pending).toContain("client.post('/provider/onboarding/submit'");
    });

    it('decision 14 the ambulance provider type, SOS dispatch and GPS router are gone from the app', () => {
      expect(exists('screens/ambulance')).toBe(false);
      for (const f of ['screens/shared/blueprint/SosDispatchScreen.tsx', 'screens/shared/blueprint/GpsRouterScreen.tsx', 'screens/shared/FleetScreen.tsx']) expect(exists(f)).toBe(false);
      expect(read('constants/index.ts')).not.toContain("key:'ambulance'");
      for (const src of [doctorNavigator, facilityNavigator, nursingDashboard, radiologyDashboard, pharmacyDashboard, labDashboard]) {
        expect(src).not.toMatch(/sos_dispatch|gps_router|ambulance_fleet|SosDispatchScreen|GpsRouterScreen|FleetScreen/);
      }
    });
  });
});
