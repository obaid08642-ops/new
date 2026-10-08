/// <reference types="node" />
// Characterization of the registration wizards: drives each wizard end to end with a fixed, valid data set and
// records every provider-onboarding / storage call. The recorded calls (golden/*.json, written once from the
// pre-refactor wizards with UPDATE_GOLDEN=1) are the contract the one-shell wizard must keep byte for byte.
import React from 'react';
import fs from 'fs';
import path from 'path';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { fileKind } from '../kit';
import { pharmacyFixture, doctorFixture, doctorUnifiedFixture, facilityFixture, nursingIndividualFixture, nursingCompanyFixture, labFixture, radiologyFixture, pharmacy24Fixture, labNoHomeFixture } from './fixtures';

type Call = { fn: string; args: unknown[] };
const mockCalls: Call[] = [];
const mockToasts: string[] = [];

jest.mock('../../../context', () => ({
  useTheme: () => ({ theme: new Proxy({}, { get: () => 'transparent' }), isDark: false }),
  useLang: () => ({ lang: 'en', isRTL: false, t: (k: string) => k, setLang: jest.fn() }),
  useAuth: () => ({ user: { isOnline: false } }),
  useToast: () => ({ show: (m: string) => { mockToasts.push(m); } }),
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock('../../../api/client', () => ({ __esModule: true, default: { get: jest.fn(async () => ({ data: [] })), post: jest.fn() } }));
jest.mock('../../../api/provider', () => {
  const actual = jest.requireActual('../../../api/provider');
  const rec = (fn: string, ret: unknown) => async (...args: unknown[]) => {
    mockCalls.push({ fn, args: JSON.parse(JSON.stringify(args)) });
    return typeof ret === 'function' ? (ret as (...a: unknown[]) => unknown)(...args) : ret;
  };
  return {
    sanitizeWizardData: actual.sanitizeWizardData,
    ProviderApi: {
      start: rec('start', {}),
      onboardingLogin: rec('onboardingLogin', {}),
      uploadFile: rec('uploadFile', (uri: string) => `https://cdn.test/${String(uri).split('/').pop()}`),
      uploadSignature: rec('uploadSignature', 'https://cdn.test/signature.png'),
      step2: rec('step2', {}),
      step3: rec('step3', {}),
      submit: rec('submit', {}),
    },
  };
});
jest.mock('../../../api/otp', () => ({ sendEmailOtp: jest.fn(async () => undefined), verifyEmailOtp: jest.fn(async () => true) }));
jest.mock('../../../api/catalogs', () => ({
  useInsuranceCatalog: () => [],
  useSpecialtiesCatalog: () => [],
  useServicesCatalog: () => [],
}));
jest.mock('../../../components/GeoPicker', () => ({ GeoPicker: () => null }));
jest.mock('../../../components/LocationPickerModal', () => ({ LocationPickerModal: () => null }));
jest.mock('../../../components/ContractModal', () => ({ ContractModal: () => null }));
jest.mock('../../../components/SignatureCanvasModal', () => ({ SignatureCanvasModal: () => null }));
jest.mock('../../../components/PlatformMap', () => ({ __esModule: true, default: () => null, Circle: () => null, Marker: () => null }));
jest.mock('react-native-signature-canvas', () => ({ __esModule: true, default: () => null }));
jest.mock('expo-image-picker', () => ({}));
jest.mock('expo-document-picker', () => ({}));
jest.mock('../../../components/OtpModal', () => {
  const R = require('react');
  const { Pressable, Text } = require('react-native');
  return {
    OtpModal: ({ visible, onVerify }: { visible: boolean; onVerify: (c: string) => Promise<boolean> }) =>
      visible ? R.createElement(Pressable, { testID: 'otp-ok', onPress: () => onVerify('123456') }, R.createElement(Text, null, 'otp')) : null,
  };
});
jest.mock('../../../components/SuccessScreen', () => ({ SuccessScreen: () => null }));

import { PharmacyRegistration } from '../../pharmacy/PharmacyRegistration';
import { FacilityRegistration } from '../../facility/FacilityRegistration';
import { NursingRegistration } from '../../nursing/NursingRegistration';
import { LabRegistration, RadiologyRegistration } from '../../lab/LabRegistration';
import { DoctorRegistration } from '../../doctor/DoctorRegistration';

interface Case {
  name: string;
  render: () => React.ReactElement;
  pages: number;            // merged pages before the review/submit page
  agree?: string;           // checkbox label on the review page (types that have one)
  submit: string;           // submit button label on the review page
}

const noop = () => {};
const CASES: Case[] = [
  { name: 'pharmacy', render: () => <PharmacyRegistration onBack={noop} onDone={noop} initialData={pharmacyFixture} />, pages: 3, agree: 'I agree to terms & conditions.', submit: 'Submit Pharmacy Application' },
  { name: 'doctor', render: () => <DoctorRegistration onBack={noop} onDone={noop} initialData={doctorFixture} />, pages: 3, submit: 'Submit for Admin Approval' },
  { name: 'doctor-unified', render: () => <DoctorRegistration onBack={noop} onDone={noop} initialData={doctorUnifiedFixture} />, pages: 3, submit: 'Submit for Admin Approval' },
  { name: 'facility', render: () => <FacilityRegistration onBack={noop} onDone={noop} initialData={facilityFixture} />, pages: 3, submit: 'Submit Application' },
  { name: 'nursing-individual', render: () => <NursingRegistration onBack={noop} onDone={noop} initialData={nursingIndividualFixture} />, pages: 3, agree: 'I agree to Nabdah Plus Terms & Privacy Policy.', submit: 'Submit Application' },
  { name: 'nursing-company', render: () => <NursingRegistration onBack={noop} onDone={noop} initialData={nursingCompanyFixture} />, pages: 3, agree: 'I agree to Nabdah Plus Terms & Privacy Policy.', submit: 'Submit Application' },
  { name: 'lab', render: () => <LabRegistration providerType="lab" onBack={noop} onDone={noop} initialData={labFixture} />, pages: 3, agree: 'I agree to Nabdah Plus Terms & Conditions and Privacy Policy, and confirm all data is accurate.', submit: 'Submit Center Application' },
  { name: 'radiology', render: () => <RadiologyRegistration onBack={noop} onDone={noop} initialData={radiologyFixture} />, pages: 3, agree: 'I agree to Nabdah Plus Terms & Conditions and Privacy Policy, and confirm all data is accurate.', submit: 'Submit Center Application' },
  { name: 'pharmacy-24x7', render: () => <PharmacyRegistration onBack={noop} onDone={noop} initialData={pharmacy24Fixture} />, pages: 3, agree: 'I agree to terms & conditions.', submit: 'Submit Pharmacy Application' },
  { name: 'lab-no-home', render: () => <LabRegistration providerType="lab" onBack={noop} onDone={noop} initialData={labNoHomeFixture} />, pages: 3, agree: 'I agree to Nabdah Plus Terms & Conditions and Privacy Policy, and confirm all data is accurate.', submit: 'Submit Center Application' },
];

const goldenFile = (name: string) => path.join(__dirname, 'golden', `${name}.json`);
const settle = () => new Promise((r) => setTimeout(r, 40));

async function drive(c: Case) {
  mockCalls.length = 0; mockToasts.length = 0;
  await render(c.render());
  for (let i = 0; i < c.pages; i++) {
    await waitFor(() => screen.getAllByText('Next'));
    await fireEvent.press(screen.getAllByText('Next').slice(-1)[0]);
    await settle();
  }
  if (c.agree) await fireEvent.press(screen.getByText(c.agree));
  await fireEvent.press(screen.getByText(c.submit));
  await waitFor(() => screen.getByTestId('otp-ok')).catch((e) => {
    throw new Error(`no OTP step. toasts: ${JSON.stringify(mockToasts)}`);
  });
  await fireEvent.press(screen.getByTestId('otp-ok'));
  await waitFor(() => expect(mockCalls.some((x) => x.fn === 'submit')).toBe(true), { timeout: 3000 }).catch((e) => {
    throw new Error(`${e.message}\ntoasts: ${JSON.stringify(mockToasts)}\ncalls: ${mockCalls.map((x) => x.fn).join(',')}`);
  });
  return mockCalls.slice();
}

describe.each(CASES)('registration payloads: $name', (c) => {
  it('sends the recorded onboarding calls', async () => {
    const all = await drive(c);
    const uploads = all.filter((x) => x.fn === 'uploadFile');
    const api = all.filter((x) => x.fn !== 'uploadFile');
    if (process.env.UPDATE_GOLDEN) {
      fs.mkdirSync(path.dirname(goldenFile(c.name)), { recursive: true });
      fs.writeFileSync(goldenFile(c.name), JSON.stringify({ api, uploads_before_refactor: uploads }, null, 2) + '\n');
      return;
    }
    const golden = JSON.parse(fs.readFileSync(goldenFile(c.name), 'utf8'));
    expect(api).toEqual(golden.api);
    // every picked file is uploaded exactly once, as what it is (the old wizards sent licences twice with two mime types)
    const uris = uploads.map((u) => u.args[0] as string);
    expect(new Set(uris).size).toBe(uris.length);
    expect(new Set(uris)).toEqual(new Set((golden.uploads_before_refactor as Call[]).map((u) => u.args[0] as string)));
    for (const u of uploads) expect(u.args[1]).toBe(fileKind(u.args[0] as string).mime);
  });
});

describe('registration: a required file that was not picked', () => {
  it('stops the licences step before anything is uploaded or sent', async () => {
    mockCalls.length = 0; mockToasts.length = 0;
    await render(<PharmacyRegistration onBack={noop} onDone={noop} initialData={{ ...pharmacyFixture, sfdaUri: '' }} />);
    await fireEvent.press(screen.getAllByText('Next').slice(-1)[0]);
    await settle();
    expect(mockToasts).toContain('Attach the SFDA licence');
    expect(mockCalls.filter((c) => c.fn === 'uploadFile' || c.fn === 'step2')).toEqual([]);
    expect(screen.getAllByText('Next').length).toBeGreaterThan(0); // still on the first page
  });
});
