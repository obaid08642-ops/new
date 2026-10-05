import React from 'react';
import { readFileSync } from 'fs';
import { join } from 'path';
import { render, screen } from '@testing-library/react-native';

// d0b9ce9 / R83: the clinic name and address the doctor registered show on
// the patient-app doctor screen and on the clinic booking confirmation.
const mockApiFetch = jest.fn();
jest.mock('../src/utils/api', () => ({ apiFetch: (...a: unknown[]) => mockApiFetch(...a) }));
jest.mock('expo-router', () => ({ router: { back: jest.fn(), push: jest.fn(), replace: jest.fn() }, useLocalSearchParams: () => ({ appointmentId: 'apt-1' }) }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('react-native-qrcode-svg', () => () => null);
jest.mock('../src/components/views/ClinicLocationView', () => () => null); // map view (native maps module)
jest.mock('../src/context/AppContext', () => {
  const colors = new Proxy({}, { get: () => '#111111' });
  const useApp = () => ({ colors, isDark: false, lang: 'ar' });
  return { useApp, useThemeColors: () => colors };
});

import { DoctorClinicInfo, doctorClinicInfo } from '../src/components/DoctorClinicInfo';
import ClinicConfirmScreen from '../app/consultations/clinic-confirm';

const DOCTOR = { id: 'doc-r83', name: 'د. ريم', clinic_name: 'عيادة النخبة', clinic_address: 'برج النخبة، شارع العليا 12' };

beforeEach(() => mockApiFetch.mockReset());

describe('R83 clinic name/address in the patient app', () => {
  it('reads the public doctor fields', () => {
    expect(doctorClinicInfo(DOCTOR)).toEqual({ name: 'عيادة النخبة', address: 'برج النخبة، شارع العليا 12' });
    expect(doctorClinicInfo({ clinic_name: ' ', clinic_address: null })).toEqual({ name: null, address: null });
  });

  it('renders the clinic block, and nothing without clinic data', async () => {
    await render(<DoctorClinicInfo doctor={DOCTOR} />);
    expect(screen.getByText('عيادة النخبة')).toBeTruthy();
    expect(screen.getByText('برج النخبة، شارع العليا 12')).toBeTruthy();
    await render(<DoctorClinicInfo doctor={{ id: 'x' }} />);
    expect(screen.queryByTestId('doctor-clinic-info')).toBeNull();
  });

  it('the doctor screen uses it with the GET /care/doctors/:id payload', () => {
    const src = readFileSync(join(__dirname, '..', 'app', 'consultations', 'doctor', '[id].tsx'), 'utf8');
    expect(src).toContain('<DoctorClinicInfo doctor={doc} />');
    // the old line read doc.address, a field /care/doctors/:id does not return
    expect(src).not.toContain('doc?.address');
  });

  it('the clinic booking confirmation shows the clinic name and address', async () => {
    mockApiFetch.mockImplementation(async (path: string) => path.startsWith('/care/appointments/')
      ? { id: 'apt-1', doctor_id: 'doc-r83', slot_start: '2026-10-06T09:00:00.000Z', status: 'confirmed' }
      : DOCTOR);
    await render(<ClinicConfirmScreen />);
    expect(await screen.findByText(/عيادة النخبة/)).toBeTruthy();
    expect(screen.getByText('برج النخبة، شارع العليا 12')).toBeTruthy();
  });
});
