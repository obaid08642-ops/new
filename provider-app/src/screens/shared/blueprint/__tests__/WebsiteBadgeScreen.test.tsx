import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';

// d2b9874 / R17: the provider-dashboard "Website badge" tab shows the
// copy-paste snippet with the real public profile URL for a verified provider,
// an explanation otherwise, and an error with retry.
const mockGet = jest.fn();
jest.mock('../../../../api/client', () => ({ __esModule: true, default: { get: (...a: unknown[]) => mockGet(...a) } }));
jest.mock('../../../../context', () => {
  const { tokens } = jest.requireActual('../../../../theme/tokens');
  const theme = new Proxy({}, { get: () => tokens.text });
  return { useTheme: () => ({ theme, isDark: false }), useLang: () => ({ lang: 'ar', setLang: jest.fn() }), useToast: () => ({ show: jest.fn() }) };
});
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));

import { WebsiteBadgeScreen } from '../WebsiteBadgeScreen';
import { tokens } from '../../../../theme/tokens';

const VERIFIED = { verified: true, reasons: [], provider_type: 'doctor', profile_url: 'https://nabd.plus/ar/doctor/dr-reem', name_ar: 'د. ريم', name_en: 'Dr. Reem' };

beforeEach(() => mockGet.mockReset());

describe('Website badge tab (R17)', () => {
  it('shows the snippet linking to the real public profile, in token colours', async () => {
    mockGet.mockResolvedValueOnce({ data: VERIFIED });
    await render(<WebsiteBadgeScreen onBack={jest.fn()} />);
    const snippet = String((await screen.findByTestId('website-badge-snippet')).props.children);
    expect(mockGet).toHaveBeenCalledWith('/provider/website-badge');
    expect(snippet).toContain('href="https://nabd.plus/ar/doctor/dr-reem"');
    expect(snippet).toContain('مزود معتمد على نبض بلس — د. ريم');
    const colours = snippet.match(/#[0-9A-Fa-f]{3,8}/g) ?? [];
    expect(colours.length).toBeGreaterThan(0);
    const tokenValues = new Set(Object.values(tokens).map((v) => String(v).toUpperCase()));
    for (const c of colours) expect(tokenValues.has(c.toUpperCase())).toBe(true);
  });

  it('explains why a provider that is not verified has no badge', async () => {
    mockGet.mockResolvedValueOnce({ data: { ...VERIFIED, verified: false, profile_url: null, reasons: ['medical_review_not_approved', 'not_public'] } });
    await render(<WebsiteBadgeScreen onBack={jest.fn()} />);
    expect(await screen.findByText('الشارة متاحة للمزودين الموثقين فقط')).toBeTruthy();
    expect(screen.getByText('لم تكتمل المراجعة الطبية لملفك بعد.')).toBeTruthy();
    expect(screen.queryByTestId('website-badge-snippet')).toBeNull();
  });

  it('shows an error with retry', async () => {
    mockGet.mockRejectedValueOnce(new Error('Network Error'));
    await render(<WebsiteBadgeScreen onBack={jest.fn()} />);
    expect(await screen.findByText('تعذر تحميل بيانات الشارة.')).toBeTruthy();
    mockGet.mockResolvedValueOnce({ data: VERIFIED });
    await fireEvent.press(screen.getByText('إعادة المحاولة'));
    expect(await screen.findByTestId('website-badge-snippet')).toBeTruthy();
  });
});
