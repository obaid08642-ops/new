// Scenario 5 (issues 1181 and provider-journeys#20): the withdrawal minimum is the server's (finance_config), and a request
// waiting for its second approval is an open request that blocks a new one, as on the server.
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('expo-crypto', () => ({ randomUUID: () => 'uuid-test-0000-0000' }));
jest.mock('../../../context', () => {
  const theme = new Proxy({}, { get: () => 'transparent' });
  return {
    useTheme: () => ({ theme, isDark: false }),
    useLang: () => ({ lang: 'en', isRTL: false, t: (k: string) => k }),
    useAuth: () => ({ user: { displayName: 'Dr Test' } }),
    useToast: () => ({ show: jest.fn() }),
  };
});
jest.mock('../../../api/client', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn(), patch: jest.fn() } }));

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';
import client from '../../../api/client';
import { WithdrawalWorkflow } from '../shared/WithdrawalWorkflow';

const get = client.get as jest.Mock;
const serve = (mine: any[]) => get.mockImplementation((url: string) => {
  if (url === '/provider/payouts/balance') return Promise.resolve({ data: { available: 900, pending: 0, locked: 0, negative: false, minimum_withdrawal: 250 } });
  if (url === '/provider/bank-account') return Promise.resolve({ data: { iban: 'SA0380000000608010167519', review_status: 'approved', bank_code: '80', holder_name: 'Dr Test' } });
  if (url === '/provider/payouts/mine') return Promise.resolve({ data: mine });
  return Promise.reject(new Error('unexpected ' + url));
});

beforeEach(() => get.mockReset());

describe('WithdrawalWorkflow follows the server', () => {
  it('shows the minimum the server enforces, not a fixed 100', async () => {
    serve([]);
    await render(<WithdrawalWorkflow onBack={() => {}} />);
    await waitFor(() => expect(screen.getByText(/min 250 SAR/)).toBeTruthy());
    expect(screen.queryByText(/min 100 SAR/)).toBeNull();
  });

  it('a request awaiting the second approval is open: it is listed as such', async () => {
    serve([{ id: 'wd_1', state: 'AWAITING_SECOND_APPROVAL', amount: 300, reference: 'PAYOUT-1', createdAt: '2026-10-15T00:00:00Z' }]);
    await render(<WithdrawalWorkflow onBack={() => {}} />);
    await waitFor(() => expect(screen.getByText('Awaiting second approval')).toBeTruthy());
  });
});
