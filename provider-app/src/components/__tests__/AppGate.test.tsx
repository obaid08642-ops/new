import React from 'react';
import { Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { AppGate } from '../AppGate';

let mockLang: 'ar' | 'en' = 'en';
const mockGet = jest.fn();
jest.mock('../../api/client', () => ({ __esModule: true, default: { get: (...a: unknown[]) => mockGet(...a) } }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('../../context', () => {
  const theme = new Proxy({}, { get: () => 'transparent' });
  return { useTheme: () => ({ theme, isDark: false }), useLang: () => ({ lang: mockLang, isRTL: mockLang === 'ar', t: (k: string) => k }) };
});

const config = { apps: { provider: { maintenance: true, message_ar: 'نعود قريباً', message_en: 'We are back soon' } } };

describe('AppGate (maintenance and forced update)', () => {
  beforeEach(() => mockGet.mockResolvedValue({ data: config }));

  it('shows the admin\'s English text and English labels to an English provider', async () => {
    mockLang = 'en';
    await render(<AppGate><Text>app</Text></AppGate>);
    expect(await screen.findByText('We are back soon')).toBeTruthy();
    expect(screen.getByText('Scheduled maintenance')).toBeTruthy();
    expect(screen.getByText('Try again')).toBeTruthy();
    expect(screen.queryByText('إعادة المحاولة')).toBeNull();
  });

  it('shows the Arabic text in Arabic', async () => {
    mockLang = 'ar';
    await render(<AppGate><Text>app</Text></AppGate>);
    expect(await screen.findByText('نعود قريباً')).toBeTruthy();
    expect(screen.getByText('صيانة مجدولة')).toBeTruthy();
  });
});
