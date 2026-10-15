// Issue 1198: the pharmacy QR is its real public page; the profile editor's public link points at the website.
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('react-native-qrcode-svg', () => {
  const { Text } = require('react-native');
  return { __esModule: true, default: ({ value }: { value: string }) => <Text testID="qr-value">{value}</Text> };
});
jest.mock('../../../context', () => {
  const theme = new Proxy({}, { get: () => 'transparent' });
  return {
    useTheme: () => ({ theme, isDark: false }),
    useLang: () => ({ lang: 'ar', isRTL: true, t: (k: string) => k }),
    useAuth: () => ({ user: { role: 'pharmacy', displayName: 'صيدلية' } }),
    useToast: () => ({ show: jest.fn() }),
  };
});
jest.mock('../../../api/client', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }));

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';
import client from '../../../api/client';
import { PharmacyQRMenuScreen } from '../RealScreensExtended';
import { publicPageUrl } from '../../../constants';

const get = client.get as jest.Mock;
beforeEach(() => get.mockReset());

describe('provider public page (issue 1198)', () => {
  it('maps each provider type to its page on the website', () => {
    expect(publicPageUrl('pharmacy', 'nahdi-olaya', 'ar')).toBe('https://nabd.plus/ar/pharmacy/nahdi-olaya');
    expect(publicPageUrl('doctor', 'dr-sara', 'en')).toBe('https://nabd.plus/en/doctor/dr-sara');
    expect(publicPageUrl('hospital', 'kfmc', 'ar')).toBe('https://nabd.plus/ar/facility/kfmc');
    expect(publicPageUrl('lab', 'any', 'ar')).toBeNull();
    expect(publicPageUrl('pharmacy', null, 'ar')).toBeNull();
  });

  it('the QR encodes the pharmacy page read from its own profile', async () => {
    get.mockResolvedValue({ data: { slug: 'nahdi-olaya' } });
    await render(<PharmacyQRMenuScreen onBack={() => {}} />);
    await waitFor(() => expect(screen.getByTestId('qr-value').props.children).toBe('https://nabd.plus/ar/pharmacy/nahdi-olaya'));
    expect(get).toHaveBeenCalledWith('/provider/profile');
  });

  it('a pharmacy without a public page yet is told so, with no code', async () => {
    get.mockResolvedValue({ data: {} });
    await render(<PharmacyQRMenuScreen onBack={() => {}} />);
    await waitFor(() => expect(screen.getByText('لا توجد صفحة عامة بعد')).toBeTruthy());
    expect(screen.queryByTestId('qr-value')).toBeNull();
  });
});
