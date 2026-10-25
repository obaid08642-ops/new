import * as fs from 'fs';
import * as path from 'path';

// The four dashboards (pharmacy, lab, radiology, nursing) must register both shared screens and offer a menu row for each.
const root = path.join(__dirname, '..');
const cases: Array<[string, string[]]> = [
  ['pharmacy/PharmacyDashboard.tsx', ['pharmacy/PharmacyMore.tsx']],
  ['lab/LabDashboard.tsx', ['lab/LabDashboard.tsx']],
  ['radiology/RadiologyDashboard.tsx', ['radiology/RadiologyDashboard.tsx']],
  ['nursing/NursingDashboard.tsx', ['nursing/NursingDashboard.tsx']],
];
describe.each(cases)('%s', (nav, menus) => {
  const navSrc = fs.readFileSync(path.join(root, nav), 'utf8');
  const menuSrc = menus.map((m) => fs.readFileSync(path.join(root, m), 'utf8')).join('\n');
  it.each(['medical_jobs', 'drug_index'])('registers the %s route and has a menu entry for it', (r) => {
    expect(navSrc).toMatch(new RegExp(`<Stack\\.Screen name="${r}">`));
    expect(menuSrc).toMatch(new RegExp(`['"]${r}['"]`));
  });
});
