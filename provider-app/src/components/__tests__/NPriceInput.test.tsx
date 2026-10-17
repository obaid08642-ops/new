import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { NPriceInput } from '../ui';

let mockLang: 'ar' | 'en' = 'en';
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('../../context', () => {
  const theme = new Proxy({}, { get: () => 'transparent' });
  return {
    useTheme: () => ({ theme, isDark: false }),
    useLang: () => ({ lang: mockLang, isRTL: mockLang === 'ar', t: (k: string) => k }),
    useToast: () => ({ show: jest.fn() }),
  };
});

describe('NPriceInput currency suffix', () => {
  it('says SAR in English and ريال in Arabic (it printed ريال in both)', async () => {
    mockLang = 'en';
    const { unmount } = await render(<NPriceInput label="Price" value="" onChange={() => {}} />);
    expect(screen.getByText('SAR')).toBeTruthy();
    expect(screen.queryByText('ريال')).toBeNull();
    unmount();
    mockLang = 'ar';
    await render(<NPriceInput label="السعر" value="" onChange={() => {}} />);
    expect(screen.getByText('ريال')).toBeTruthy();
  });
});
