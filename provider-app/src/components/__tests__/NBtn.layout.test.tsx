import React from 'react';
import { StyleSheet, View } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { NBtn } from '../ui';

jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('../../context', () => {
  const theme = new Proxy({}, { get: () => 'transparent' });
  return {
    useTheme: () => ({ theme, isDark: false }),
    useLang: () => ({ lang: 'en', isRTL: false, t: (k: string) => k }),
    useToast: () => ({ show: jest.fn() }),
  };
});

// NBtn is width:100% by itself. Two of them in a row with style={{ flex: 1 }} (the flex went to the inner touchable) were each
// as wide as the whole row: the second left the screen (pharmacy "Returns Manager", nursing "Reject", "Cancel / Confirm").
describe('NBtn in a row', () => {
  it('shares the row when the caller passes flex: the wrapper takes the flex and is not 100% wide', async () => {
    await render(<View style={{ flexDirection: 'row' }}><NBtn label="A" onPress={() => {}} style={{ flex: 1 }} /><NBtn label="B" onPress={() => {}} style={{ flex: 2 }} /></View>);
    const row: any = screen.toJSON();
    const [a, b] = row.children;
    expect(StyleSheet.flatten(a.props.style)).toMatchObject({ flex: 1 });
    expect(StyleSheet.flatten(a.props.style).width).toBeUndefined();
    expect(StyleSheet.flatten(b.props.style)).toMatchObject({ flex: 2 });
  });

  it('is still the full width of its container without flex', async () => {
    await render(<NBtn label="A" onPress={() => {}} />);
    const el: any = screen.toJSON();
    expect(StyleSheet.flatten(el.props.style)).toMatchObject({ width: '100%' });
  });
});
