import fs from 'fs';
import path from 'path';

// 'ar-SA' alone is the Hijri calendar, and a hard-coded Arabic locale shows Arabic digits in English: screens use
// utils/dates (Gregorian, en-GB for English). This guards the seven call sites the walkthrough found.
const SRC = path.resolve(__dirname, '../..');
const FILES = [
  'screens/doctor/doctor/MedicalReportScreen.tsx',
  'screens/doctor/doctor/EPrescriptionScreen.tsx',
  'screens/doctor/doctor/ReferralScreen.tsx',
  'screens/doctor/doctor/NotificationsScreen.tsx',
  'screens/radiology/RadiologyDashboard.tsx',
  'screens/nursing/NursingDashboard.tsx',
];

describe('dates on screens follow the app language and the Gregorian calendar', () => {
  it.each(FILES)('%s has no hard-coded ar-SA date or time', (file) => {
    const text = fs.readFileSync(path.join(SRC, file), 'utf8');
    expect(text).not.toMatch(/toLocale(Date|Time)?String\(\s*'ar-SA/);
  });
});
