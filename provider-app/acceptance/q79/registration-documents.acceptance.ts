// ACCEPTANCE — Q79 (Round 12 Phase A #2), provider-app side. Written by the
// reviewer before the fix; the implementing agent makes it pass and may not edit it.
//
// Required behaviour: every registration screen sends, with its step-2 call
// (ProviderApi.step2 → /provider-onboarding/step2), a typed `documents` list with one entry for each
// document type the backend requires for that provider type
// (REQUIRED_DOCS_BY_PROVIDER_TYPE in backend/src/modules/provider/provider.enums.ts),
// so a provider registered from the app can be approved without any other upload.
// The screen must let the provider pick each of those files (the IBAN letter is
// new for every type: testID "kyc-iban-letter"). An independent nurse registers
// as `nursing`, a nursing company as `home_care`.
declare const require: (m: string) => any;
declare const __dirname: string;
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../../..');

/** backend REQUIRED_DOCS_BY_PROVIDER_TYPE, as lower-case doc_type values. */
function requiredDocs(): Record<string, string[]> {
  const enums: string = fs.readFileSync(path.join(ROOT, 'backend/src/modules/provider/provider.enums.ts'), 'utf8');
  const value = (member: string) => {
    const m = enums.match(new RegExp(`${member}\\s*=\\s*'([a-z_]+)'`));
    return m ? m[1] : member.toLowerCase();
  };
  const block = enums.slice(enums.indexOf('REQUIRED_DOCS_BY_PROVIDER_TYPE'));
  const out: Record<string, string[]> = {};
  for (const m of block.matchAll(/\[ProviderType\.(\w+)\]:\s*\[([^\]]*)\]/g)) {
    out[m[1].toLowerCase()] = [...m[2].matchAll(/ProviderDocumentType\.(\w+)/g)].map((x: RegExpMatchArray) => value(x[1]));
  }
  return out;
}

const SCREENS: Array<[string, string[]]> = [
  ['ambulance/AmbulanceRegistration.tsx', ['ambulance']],
  ['facility/FacilityRegistration.tsx', ['hospital']],
  ['pharmacy/PharmacyRegistration.tsx', ['pharmacy']],
  ['lab/LabRegistration.tsx', ['laboratory']],
  ['radiology/RadiologyRegistration.tsx', ['radiology']],
  ['doctor/DoctorRegistration.tsx', ['doctor']],
  ['nursing/NursingRegistration.tsx', ['nursing', 'home_care']],
];

describe('Q79: registration screens send typed KYC documents with step 2', () => {
  const required = requiredDocs();

  it('the backend list was read', () => {
    for (const [, types] of SCREENS) for (const t of types) expect(required[t]?.length).toBeGreaterThan(0);
  });

  for (const [file, types] of SCREENS) {
    const src: string = fs.readFileSync(path.join(ROOT, 'provider-app/src/screens', file), 'utf8');
    // the step-2 call: ProviderApi.step2(...) or a direct /provider-onboarding/step2 request
    const step2At = Math.max(src.indexOf('.step2('), src.indexOf('/provider-onboarding/step2'));
    for (const type of types) {
      it(`${file}: step 2 sends a typed document for every type a ${type} needs`, () => {
        expect(step2At).toBeGreaterThanOrEqual(0);
        expect(src).toMatch(/\bdocuments\s*:/);
        for (const doc of required[type]) expect(src).toContain(`'${doc}'`);
      });
    }
    it(`${file}: the provider can pick the IBAN letter`, () => {
      expect(src).toMatch(/testID="kyc-iban-letter"/);
    });
  }

  it('an independent nurse registers as nursing, a nursing company as home_care', () => {
    const src: string = fs.readFileSync(path.join(ROOT, 'provider-app/src/screens/nursing/NursingRegistration.tsx'), 'utf8');
    // the registration type depends on the individual/company choice
    expect(src).toMatch(/individual'?\s*\?\s*'nursing'\s*:\s*'home_care'/);
  });
});
