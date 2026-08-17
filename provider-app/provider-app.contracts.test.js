const fs = require('node:fs');
const path = require('node:path');

describe('Provider App release contracts', () => {
  const root = process.cwd();
  const dashboard = fs.readFileSync(path.join(root, 'src/screens/doctor/DoctorDashboard.tsx'), 'utf8');
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
});
