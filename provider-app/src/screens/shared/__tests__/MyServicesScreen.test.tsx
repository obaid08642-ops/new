// G1: the provider sets its own price per service through PUT /provider/services/:vertical/:serviceId (the source the patient reads).
const mockShow = jest.fn();
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('../../../context', () => {
  const theme = new Proxy({}, { get: () => 'transparent' });
  return {
    useTheme: () => ({ theme, isDark: false }),
    useLang: () => ({ lang: 'en', isRTL: false, t: (k: string) => k }),
    useAuth: () => ({ user: { displayName: 'Lab' } }),
    useToast: () => ({ show: mockShow }),
  };
});
jest.mock('../../../api/client', () => ({ __esModule: true, default: { get: jest.fn(), put: jest.fn() } }));

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react-native';
import client from '../../../api/client';
import { MyServicesScreen } from '../MyServicesScreen';

const get = client.get as jest.Mock;
const put = client.put as jest.Mock;
const base = { code: 'CBC', name_ar: 'صورة دم', name_en: 'Blood count', category: 'blood', image_url: null, catalogue_price: 110, home_visit_supported: true, currency: 'SAR' };
const offeredRow = { ...base, service_id: 's1', offered: true, where: 'premises', insurance: true, price: 95 };
const idleRow = { ...base, service_id: 's2', code: 'TSH', name_en: 'Thyroid', offered: false, where: null, insurance: false, price: null };

beforeEach(() => { get.mockReset(); put.mockReset(); mockShow.mockReset(); });

describe('MyServicesScreen', () => {
  it('lists the catalogue with the own price and falls back to the catalogue price', async () => {
    get.mockResolvedValue({ data: [offeredRow, idleRow] });
    await render(<MyServicesScreen vertical="lab" />);
    await waitFor(() => expect(screen.getByText('Blood count')).toBeTruthy());
    expect(get).toHaveBeenCalledWith('/provider/services/lab');
    expect(screen.getByText('95 SAR')).toBeTruthy();
    expect(screen.getByText('110 SAR')).toBeTruthy();
  });

  it('switching a service off is one PUT with offered:false', async () => {
    get.mockResolvedValue({ data: [offeredRow] });
    put.mockResolvedValue({ data: { ...offeredRow, offered: false, where: null, price: null, insurance: false } });
    await render(<MyServicesScreen vertical="lab" />);
    await waitFor(() => expect(screen.getByText('Blood count')).toBeTruthy());
    fireEvent(screen.getByLabelText('Blood count: offer this service'), 'valueChange', false);
    await waitFor(() => expect(put).toHaveBeenCalledWith('/provider/services/lab/s1', { offered: false, insurance: false }));
  });

  it('shows a retry state when the list cannot load', async () => {
    get.mockRejectedValue(new Error('down'));
    await render(<MyServicesScreen vertical="radiology" />);
    await waitFor(() => expect(screen.getByText('Could not load the services')).toBeTruthy());
  });
});
