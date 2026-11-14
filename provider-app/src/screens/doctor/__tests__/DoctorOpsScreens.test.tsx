// The four doctor ops screens (leaves, prescription templates, saved diagnoses, blacklist): loaded, empty and error states.
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('../../../context', () => {
  const theme = new Proxy({}, { get: () => 'transparent' });
  return {
    useTheme: () => ({ theme, isDark: false }),
    useLang: () => ({ lang: 'en', isRTL: false, t: (k: string) => k }),
    useAuth: () => ({ user: { displayName: 'Dr Test' } }),
    useToast: () => ({ show: jest.fn() }),
  };
});
jest.mock('../../../api/client', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn(), delete: jest.fn() } }));

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';
import client from '../../../api/client';
import { DoctorLeavesScreen, PrescriptionTemplatesScreen, SavedDiagnosesScreen, DoctorBlacklistScreen } from '../DoctorOpsScreens';

const get = client.get as jest.Mock;
beforeEach(() => get.mockReset());

const cases: Array<[string, React.ComponentType<{ onBack: () => void }>, string, any[], string, string]> = [
  ['leaves', DoctorLeavesScreen, '/provider/ops/doctor/leave',
    [{ id: 'l1', start_date: '2026-11-01T00:00:00Z', end_date: '2026-11-05T00:00:00Z', type: 'vacation', status: 'pending_facility' }], 'Awaiting facility approval', 'No leaves'],
  ['templates', PrescriptionTemplatesScreen, '/provider/ops/doctor/templates',
    [{ id: 't1', name: 'Flu pack', items: [{ med: 'Paracetamol 500', dose: '1x3' }], usage_count: 2 }], 'Flu pack', 'No templates yet'],
  ['diagnoses', SavedDiagnosesScreen, '/provider/ops/doctor/diagnoses',
    [{ id: 'd1', name_ar: 'التهاب الحلق', name_en: 'Pharyngitis', icd: 'J02.9' }], 'التهاب الحلق', 'No saved diagnoses'],
  ['blacklist', DoctorBlacklistScreen, '/provider/ops/doctor/blacklist',
    [{ patient_id: 'p1', reason: 'No show', createdAt: '2026-10-01T00:00:00Z' }], 'p1', 'No blocked patients'],
];

describe.each(cases)('%s screen', (_n, Screen, url, rows, loadedText, emptyTitle) => {
  it('lists what the server returns', async () => {
    get.mockResolvedValue({ data: rows });
    await render(<Screen onBack={() => {}} />);
    await waitFor(() => expect(screen.getByText(new RegExp(loadedText))).toBeTruthy());
    expect(get.mock.calls[0][0]).toBe(url);
  });
  it('shows the empty state', async () => {
    get.mockResolvedValue({ data: [] });
    await render(<Screen onBack={() => {}} />);
    await waitFor(() => expect(screen.getByText(emptyTitle)).toBeTruthy());
  });
  it('shows an error with retry when the call fails', async () => {
    get.mockRejectedValue(new Error('net'));
    await render(<Screen onBack={() => {}} />);
    await waitFor(() => expect(screen.getByText('Could not load')).toBeTruthy());
    expect(screen.getByText('Retry')).toBeTruthy();
    expect(screen.queryByText(emptyTitle)).toBeNull();
  });
});
