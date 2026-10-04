// Q79: every registration screen sends, with step2, a typed document for each
// KYC type its provider type needs for approval (REQUIRED_DOCUMENTS mirrors the
// backend rule; onboardingDocuments.test.ts checks the mirror).
import { REQUIRED_DOCUMENTS } from '../onboardingDocuments';

declare const require: (m: string) => any;
declare const __dirname: string;
const fs = require('fs');
const path = require('path');

const SCREENS: Array<[string, string[]]> = [
  ['ambulance/AmbulanceRegistration.tsx', ['ambulance']],
  ['facility/FacilityRegistration.tsx', ['hospital']],
  ['pharmacy/PharmacyRegistration.tsx', ['pharmacy']],
  ['lab/LabRegistration.tsx', ['laboratory']],
  ['radiology/RadiologyRegistration.tsx', ['radiology']],
  ['doctor/DoctorRegistration.tsx', ['doctor']],
  ['nursing/NursingRegistration.tsx', ['nursing', 'home_care']],
];

describe('registration screens send typed KYC documents (Q79)', () => {
  for (const [file, types] of SCREENS) {
    const src: string = fs.readFileSync(path.join(__dirname, '../../screens', file), 'utf8');
    const sent = new Set([...src.matchAll(/\['(\w+)',\s*[\w.]+\]/g)].map((m: RegExpMatchArray) => m[1]));
    for (const type of types) {
      it(`${file} covers every document a ${type} needs`, () => {
        expect(src).toMatch(/documents:/);
        for (const doc of REQUIRED_DOCUMENTS[type]) expect(sent).toContain(doc);
      });
    }
    it(`${file} has a picker for each document it would otherwise lack`, () => {
      if (types.some((t) => REQUIRED_DOCUMENTS[t].includes('iban_letter'))) expect(src).toMatch(/testID="kyc-iban-letter"/);
    });
  }

  it('an independent nurse registers as nursing, a company as home_care', () => {
    const src: string = fs.readFileSync(path.join(__dirname, '../../screens/nursing/NursingRegistration.tsx'), 'utf8');
    expect(src).toMatch(/type: data\.mode === 'individual' \? 'nursing' : 'home_care'/);
  });
});
