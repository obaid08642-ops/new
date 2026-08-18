const fs = require('node:fs');
const path = require('node:path');

describe('Provider App release contracts', () => {
  const root = process.cwd();
  const dashboard = fs.readFileSync(path.join(root, 'src/screens/doctor/DoctorDashboard.tsx'), 'utf8');
  const pharmacyDashboard = fs.readFileSync(path.join(root, 'src/screens/pharmacy/PharmacyDashboard.tsx'), 'utf8');
  const radiologyDashboard = fs.readFileSync(path.join(root, 'src/screens/radiology/RadiologyDashboard.tsx'), 'utf8');
  const registrations = [
    'doctor/DoctorRegistration.tsx',
    'pharmacy/PharmacyRegistration.tsx',
    'lab/LabRegistration.tsx',
    'radiology/RadiologyRegistration.tsx',
    'nursing/NursingRegistration.tsx',
  ].map(file => fs.readFileSync(path.join(root, 'src/screens', file), 'utf8')).join('\n');
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

  it('contains real provider intake actions and refreshes after mutations', () => {
    expect(dashboard).toContain('/provider/jobs/queue?status=incoming&kind=consultation');
    expect(dashboard).toContain('/provider/jobs/');
    expect(dashboard).toContain('/provider/stats/today');
    expect(dashboard).toContain('fetchQueue();');
  });

  it('does not ship fake pharmacy/radiology terminal actions', () => {
    expect(pharmacyDashboard).not.toContain('Simulate Drug Scan');
    expect(pharmacyDashboard).not.toContain('طلب وصفة #B-9901');
    expect(pharmacyDashboard).toContain("client.get('/provider/pharmacy/broadcasts')");
    expect(pharmacyDashboard).toContain('/provider/pharmacy/orders/${orderId}/accept');
    expect(pharmacyDashboard).toContain('/provider/pharmacy/broadcasts/${rejectOrderId}/reject');
    expect(pharmacyDashboard).not.toContain('/pharmacy/orders/${rejectOrderId}/reject');
    expect(pharmacyDashboard).toContain("client.get('/provider/pharmacy/allocations', { params: { status: 'completed' } })");
    expect(radiologyDashboard).not.toContain('Coming with S3 integration');
  });

  it('does not seed provider registration with commercial or geographic values', () => {
    expect(registrations).not.toMatch(/clinicPrice:'300'|homePrice:'500'|videoPrice:'200'/);
    expect(registrations).not.toMatch(/priceVisit: '150'|priceHour: '80'|priceDay: '800'|priceMonth: '8000'/);
    expect(registrations).not.toContain('lat: 24.7136');
    expect(registrations).not.toContain('lng: 46.6753');
    expect(registrations).not.toContain("cashOnly: true");
  });
});
