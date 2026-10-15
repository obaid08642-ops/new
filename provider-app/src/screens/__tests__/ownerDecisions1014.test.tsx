// Owner decisions of 2026-10-14 (docs/review/OWNER_DECISIONS_PENDING_2026-10-14.md), provider app:
//   B21: the pharmacist may enter their own unit price, capped by the registered (SFDA) price, and it is logged.
//   B23: no ambulance fee in the facility tariffs (decision 14: no ambulance service).
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('../../context', () => {
  const theme = new Proxy({}, { get: () => 'transparent' });
  return {
    useTheme: () => ({ theme, isDark: false }),
    useLang: () => ({ lang: 'en', isRTL: false, t: (k: string) => k }),
    useAuth: () => ({ user: { displayName: 'Test Facility' }, logout: jest.fn() }),
    useToast: () => ({ show: jest.fn() }),
  };
});
jest.mock('../../api/client', () => ({ __esModule: true, default: { get: jest.fn(() => Promise.resolve({ data: [] })), post: jest.fn(), patch: jest.fn() } }));

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { PharmacyBroadcastResponse } from '../shared/blueprint/PharmacyBroadcastResponse';
import { FacilitySettingsScreen } from '../facility/facility/FacilitySettingsScreen';

describe('owner decisions 2026-10-14 (provider app)', () => {
  it('B21: the offer composer says a custom unit price is allowed up to the SFDA price and logged', async () => {
    await render(<PharmacyBroadcastResponse onBack={() => {}} broadcast={{ order_id: 'order-000123', items: [] }} />);
    expect(screen.getByText(/You may enter your own unit price up to the registered \(SFDA\) price; every price you enter is logged\./)).toBeTruthy();
    expect(screen.queryByText(/Prices, delivery fees, and ETA are never entered here/)).toBeNull();
  });

  it('B23: the facility tariffs have no ambulance fee', async () => {
    await render(<FacilitySettingsScreen onLogout={() => {}} onNavigate={() => {}} />);
    await fireEvent.press(screen.getByText('Pricing & Rates'));
    expect(screen.getByText('Emergency Fee (SAR)')).toBeTruthy();
    expect(screen.queryByText('Ambulance Fee (SAR)')).toBeNull();
  });
});
