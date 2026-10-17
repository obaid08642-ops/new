import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { ChronicDiseaseProgramScreen } from '../RealScreensExtended';

const mockGet = jest.fn();
jest.mock('../../../api/client', () => ({ __esModule: true, default: { get: (...a: unknown[]) => mockGet(...a), post: jest.fn() } }));
jest.mock('react-native-qrcode-svg', () => 'QRCode', { virtual: true });
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('../../../context', () => {
  const theme = new Proxy({}, { get: () => 'transparent' });
  return {
    useTheme: () => ({ theme, isDark: false }),
    useLang: () => ({ lang: 'en', isRTL: false, t: (k: string) => k }),
    useToast: () => ({ show: jest.fn() }),
    useAuth: () => ({ user: { id: 'ph-1' } }),
  };
});

describe('pharmacy chronic care program', () => {
  it('does not say "no refill orders" when the server refused the read (503 canonical_pharmacy_flow_required)', async () => {
    mockGet.mockRejectedValue({ response: { status: 503, data: { message: 'canonical_pharmacy_flow_required' } } });
    await render(<ChronicDiseaseProgramScreen onBack={() => {}} />);
    expect(await screen.findByText('Could not load the refill orders from the server')).toBeTruthy();
    expect(screen.queryByText('No refill orders yet')).toBeNull();
  });

  it('says "no refill orders" when the read succeeds with an empty list', async () => {
    mockGet.mockResolvedValue({ data: [] });
    await render(<ChronicDiseaseProgramScreen onBack={() => {}} />);
    expect(await screen.findByText('No refill orders yet')).toBeTruthy();
  });
});
