import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { NEmpty } from '../ui';

jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('../../context', () => {
  const theme = new Proxy({}, { get: () => 'transparent' });
  return {
    useTheme: () => ({ theme, isDark: false }),
    useLang: () => ({ lang: 'en', isRTL: false, t: (k: string) => k, setLang: jest.fn() }),
    useToast: () => ({ show: jest.fn() }),
  };
});

describe('NEmpty icon', () => {
  it.each(['document', 'calendar', 'alert', 'shield'])('draws the icon "%s" instead of printing its name', async (name) => {
    await render(<NEmpty icon={name} title="Nothing here" />);
    expect(screen.getByText('Nothing here')).toBeTruthy();
    expect(screen.queryByText(name)).toBeNull();
  });

  it('still prints a glyph that is not an icon name', async () => {
    await render(<NEmpty icon="⚠️" title="Nothing here" />);
    expect(screen.getByText('⚠️')).toBeTruthy();
  });
});

describe('NEmpty icon aliases', () => {
  it.each(['flask', 'notifications', 'hospital', 'checklist'])('"%s" resolves to a real icon', async (name) => {
    await render(<NEmpty icon={name} title="Nothing here" />);
    expect(screen.queryByText(name)).toBeNull();
  });
});
