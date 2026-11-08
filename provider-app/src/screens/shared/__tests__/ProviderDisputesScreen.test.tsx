// PV-15: the provider sees the disputes patients raised about their bookings (GET /support/provider/disputes), without the patient's words.
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
import { render, screen, waitFor, fireEvent } from '@testing-library/react-native';
import client from '../../../api/client';
import { ProviderDisputesScreen } from '../ProviderDisputesScreen';

const get = client.get as jest.Mock;
const row = { id: 'd1', subject: 'Charged twice', category: 'PAYMENT', status: 'OPEN', booking_kind: 'consultation', booking_id: 'a1', createdAt: '2026-11-01T10:00:00.000Z' };

beforeEach(() => { get.mockReset(); });

describe('ProviderDisputesScreen', () => {
  it('lists the disputes from the provider route with status, booking and category', async () => {
    get.mockResolvedValue({ data: [row, { ...row, id: 'd2', subject: 'Late refund', status: 'RESOLVED', category: 'COMPLAINT' }] });
    await render(<ProviderDisputesScreen />);
    await waitFor(() => expect(screen.getByText('Charged twice')).toBeTruthy());
    expect(get).toHaveBeenCalledWith('/support/provider/disputes');
    expect(screen.getByText('Open')).toBeTruthy();
    expect(screen.getByText('Resolved')).toBeTruthy();
    expect(screen.getByText('About: Consultation · Payment')).toBeTruthy();
    expect(screen.getByText('Late refund')).toBeTruthy();
  });

  it('shows an empty state when there are no disputes', async () => {
    get.mockResolvedValue({ data: [] });
    await render(<ProviderDisputesScreen />);
    await waitFor(() => expect(screen.getByText('No disputes on your bookings')).toBeTruthy());
  });

  it('shows a retry state when the list cannot load, and loads again on retry', async () => {
    get.mockRejectedValueOnce(new Error('down')).mockResolvedValueOnce({ data: [row] });
    await render(<ProviderDisputesScreen />);
    await waitFor(() => expect(screen.getByText('Could not load the disputes')).toBeTruthy());
    fireEvent.press(screen.getByText('Try again'));
    await waitFor(() => expect(screen.getByText('Charged twice')).toBeTruthy());
    expect(get).toHaveBeenCalledTimes(2);
  });

  it('shows an unknown status or category as the backend wrote it, never an empty badge', async () => {
    get.mockResolvedValue({ data: [{ ...row, status: 'ESCALATED', category: 'OTHER' }] });
    await render(<ProviderDisputesScreen />);
    await waitFor(() => expect(screen.getByText('ESCALATED')).toBeTruthy());
    expect(screen.getByText('About: Consultation · OTHER')).toBeTruthy();
  });
});
