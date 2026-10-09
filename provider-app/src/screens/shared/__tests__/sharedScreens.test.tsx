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
jest.mock('../../../api/client', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn(), patch: jest.fn() } }));

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';
import client from '../../../api/client';
import { ProviderWalletScreen } from '../shared/ProviderWalletScreen';
import { RevenueInsights } from '../blueprint/RevenueInsights';
import { buildProfilePatch } from '../shared/ProviderProfileEditor';

const get = client.get as jest.Mock;

beforeEach(() => {
  get.mockReset();
  get.mockImplementation((url: string) => {
    if (url === '/provider/payouts/balance') return Promise.resolve({ data: { available: 120, pending: 5, locked: 0, lifetime_earned: 900 } });
    if (url === '/provider/wallet/transactions') return Promise.resolve({ data: [] });
    if (url === '/provider/me') return Promise.resolve({ data: { profile: {} } });
    if (url === '/provider/ops/wallet/ledger') return Promise.resolve({ data: { transactions: [], summary: { pending: 0, balance: 0 } } });
    return Promise.reject(new Error('unexpected ' + url));
  });
});

describe('ProviderWalletScreen is the one wallet (M3)', () => {
  it('shows the balance from the payouts ledger and no "Dues" figure', async () => {
    await render(<ProviderWalletScreen onBack={() => {}} onNavigate={() => {}} />);
    await waitFor(() => expect(screen.getByText(/120/)).toBeTruthy());
    expect(screen.queryByText(/Dues/i)).toBeNull();
  });

  it('as the embedded tab it has no back button, and links to the revenue report only when asked', async () => {
    await render(<ProviderWalletScreen embedded revenueRoute="revenue_insights" onNavigate={() => {}} />);
    await waitFor(() => expect(screen.getByText(/120/)).toBeTruthy());
    expect(screen.queryByTestId('nheader-bar')).toBeNull();
    expect(screen.getByText('Revenue Insights & Reports')).toBeTruthy();
  });

  it('as a stack route it keeps the back button and no revenue link', async () => {
    await render(<ProviderWalletScreen onBack={() => {}} onNavigate={() => {}} />);
    await waitFor(() => expect(screen.getByText(/120/)).toBeTruthy());
    expect(screen.getByTestId('nheader-bar')).toBeTruthy();
    expect(screen.queryByText('Revenue Insights & Reports')).toBeNull();
  });
});

describe('RevenueInsights is one screen with a role header (M4)', () => {
  it('uses the same ledger call for a provider and for a facility', async () => {
    await render(<RevenueInsights onBack={() => {}} />);
    await waitFor(() => expect(screen.getByText('Revenue Insights')).toBeTruthy());
    expect(get).toHaveBeenCalledWith('/provider/ops/wallet/ledger');
  });

  it('only the header differs for a facility', async () => {
    await render(<RevenueInsights role="facility" onBack={() => {}} />);
    await waitFor(() => expect(screen.getByText('Unified Financial Reports')).toBeTruthy());
    expect(get).toHaveBeenCalledWith('/provider/ops/wallet/ledger');
  });
});

describe('buildProfilePatch sends only what changed (M8)', () => {
  const base = {
    nameAr: 'د', nameEn: 'Dr', descAr: '', descEn: '', website: '', exp: '5', specialty: 'Cardiology', degree: 'MD', clinicImages: ['a'],
    avatarId: '', pin: { lat: 1, lng: 2 }, radius: '10', fee: '0', active: false, social: '',
  };

  it('is empty when nothing changed', () => {
    expect(buildProfilePatch(base, { ...base }, 'doctor')).toEqual({});
  });

  it('sends doctor fields from the profile section and location fields from the location section', () => {
    const cur = { ...base, nameEn: 'Dr X', exp: '7', radius: '15', pin: { lat: 3, lng: 4 } };
    expect(buildProfilePatch(base, cur, 'doctor')).toEqual({
      display_name_en: 'Dr X', years_of_experience: 7, max_delivery_radius_km: 15, geo: { lat: 3, lng: 4 },
    });
  });

  it('a nurse never sends doctor-only or location fields', () => {
    const cur = { ...base, exp: '9', specialty: 'x', radius: '99', nameEn: 'N' };
    expect(buildProfilePatch(base, cur, 'nursing')).toEqual({ display_name_en: 'N' });
  });

  it('other roles only edit the public page', () => {
    const cur = { ...base, nameEn: 'ignored', active: true, social: ' https://x.example ' };
    expect(buildProfilePatch(base, cur, 'other')).toEqual({ public_eligibility: true, social: { website: 'https://x.example' } });
  });
});
