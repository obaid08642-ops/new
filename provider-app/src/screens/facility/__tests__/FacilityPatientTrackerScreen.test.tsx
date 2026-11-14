// Audit-3 gap 20: the facility patient tracker shows what the backend really knows (inpatient or booked, where, since when, with whom), no MRN and no invented clinical status.
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('../../../context', () => {
  const theme = new Proxy({}, { get: () => 'transparent' });
  const { translate } = require('../../../i18n');
  return {
    useTheme: () => ({ theme, isDark: false }),
    useLang: () => ({ lang: 'en', isRTL: false, t: (k: string, p?: Record<string, string | number>) => translate('en', k, p) }),
  };
});
jest.mock('../../../api/client', () => ({ __esModule: true, default: { get: jest.fn() } }));

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';
import client from '../../../api/client';
import { FacilityPatientTrackerScreen } from '../FacilityPatientTrackerScreen';

const get = client.get as jest.Mock;

beforeEach(() => { get.mockReset(); });

describe('FacilityPatientTrackerScreen', () => {
  it('shows an inpatient with ward, bed, admission date and no clinical status', async () => {
    get.mockResolvedValue({ data: [{ id: 'p1', name: 'Sara', kind: 'inpatient', ward_name: 'Cardiac ward', bed_number: '12', admitted_at: '2026-11-01T08:00:00.000Z', doctor_name: 'د. ليلى', doctor_name_en: 'Dr Layla' }] });
    await render(<FacilityPatientTrackerScreen onBack={() => {}} />);
    await waitFor(() => expect(screen.getByText('Sara')).toBeTruthy());
    expect(get).toHaveBeenCalledWith('/provider/facility/patients/active');
    expect(screen.getByText('Inpatient')).toBeTruthy();
    expect(screen.getByText('Cardiac ward · Bed 12')).toBeTruthy();
    expect(screen.getByText('Dr Layla')).toBeTruthy();
    expect(screen.getByText('Admitted')).toBeTruthy();
    expect(screen.getByText('Discharge summary')).toBeTruthy();
    for (const invented of ['Critical', 'Stable', 'Observation']) expect(screen.queryByText(invented)).toBeNull();
  });

  it('a booked patient shows the next visit and no discharge action', async () => {
    get.mockResolvedValue({ data: [{ id: 'p2', name: 'Omar', kind: 'booked', appointment_at: '2026-11-09T10:00:00.000Z', doctor_name_en: 'Dr Layla' }] });
    await render(<FacilityPatientTrackerScreen onBack={() => {}} />);
    await waitFor(() => expect(screen.getByText('Omar')).toBeTruthy());
    expect(screen.getByText('Booked')).toBeTruthy();
    expect(screen.getByText('Next visit')).toBeTruthy();
    expect(screen.queryByText('Discharge summary')).toBeNull();
    expect(screen.getByText('Prescription')).toBeTruthy();
  });

  it('shows an empty state when there are no patients', async () => {
    get.mockResolvedValue({ data: [] });
    await render(<FacilityPatientTrackerScreen onBack={() => {}} />);
    await waitFor(() => expect(screen.getByText('No patients right now')).toBeTruthy());
  });
});
