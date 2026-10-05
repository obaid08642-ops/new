import React from 'react';
import { StyleSheet } from 'react-native';
import { render, screen } from '@testing-library/react-native';

// Q69 fallback panel: its text must stay readable (WCAG AA 4.5:1 for 15px text).
jest.mock('react-native-maps', () => {
  const R = require('react');
  class MockMap extends R.Component { render() { return null; } }
  return { __esModule: true, default: MockMap, Marker: () => null, PROVIDER_DEFAULT: 'default' };
});
jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { android: { config: { googleMaps: { apiKey: '' } } } } } }));

function contrast(a: string, b: string): number {
  const lum = (hex: string) => {
    const [r, g, bl] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [x, y] = [lum(a), lum(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

describe('map unavailable panel', () => {
  it('text meets 4.5:1 on its background', async () => {
    require('react-native').Platform.OS = 'android';
    const MapView = require('../MapPrimitives.native').default;
    await render(<MapView />);
    const box = StyleSheet.flatten(screen.getByTestId('map-unavailable').props.style);
    const text = StyleSheet.flatten(screen.getByText('الخريطة غير متاحة حالياً').props.style);
    expect(contrast(text.color, box.backgroundColor)).toBeGreaterThanOrEqual(4.5);
  });
});
