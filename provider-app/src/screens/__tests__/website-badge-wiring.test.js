// d2b9874 / R17: the Website badge tab is reachable from the doctor dashboard
// settings, and neither the screen nor its snippet builder imports lucide-react.
const fs = require('fs');
const path = require('path');
const read = (...p) => fs.readFileSync(path.join(__dirname, '..', ...p), 'utf8');

describe('Website badge tab wiring (R17)', () => {
  it('has a settings row and a stack screen', () => {
    expect(read('doctor', 'doctor', 'DoctorSettingsTab.tsx')).toContain("onNavigate('website_badge')");
    expect(read('doctor', 'doctor', 'DoctorDashboardNavigator.tsx')).toContain('name="website_badge"');
  });

  it('imports no lucide-react', () => {
    const src = read('shared', 'blueprint', 'WebsiteBadgeScreen.tsx') + read('..', 'utils', 'websiteBadge.ts');
    expect(src).not.toContain('lucide-react');
  });
});
