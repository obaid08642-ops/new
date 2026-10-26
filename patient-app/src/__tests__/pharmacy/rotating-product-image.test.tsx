import React from 'react';
import { act, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { RotatingProductImage, ROTATION_MS, nextIndex } from '../../components/pharmacy/RotatingProductImage';
import { setReduceMotionForTest } from '../../utils/motion';

/** A product card with more than one picture turns through them every 2.5 s while it is on screen. */

jest.mock('react-native-localize', () => ({ getLocales: () => [], findBestLanguageTag: () => undefined }));
jest.mock('../../context/AppContext', () => ({
  useApp: () => ({ isDark: false, lang: 'en', isRTL: false, toggleTheme: jest.fn(), setLang: jest.fn() }),
  LANGUAGES: [],
}));
const mockShown: string[] = [];
jest.mock('../../components/ProductImage', () => ({
  __esModule: true,
  default: ({ uri }: { uri?: string }) => {
    mockShown.push(String(uri));
    return null;
  },
}));
jest.mock('expo-image', () => ({ Image: { prefetch: jest.fn(() => Promise.resolve(true)) } }));

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, bottom: 0, left: 0, right: 0 } };
const wrap = (ui: React.ReactElement) => <SafeAreaProvider initialMetrics={metrics}>{ui}</SafeAreaProvider>;
const last = () => mockShown[mockShown.length - 1];

describe('card picture rotation', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockShown.length = 0;
    setReduceMotionForTest(false);
  });
  afterEach(() => jest.useRealTimers());

  it('turns to the next picture every 2.5 s while on screen, and back to the first after the last', async () => {
    await render(wrap(<RotatingProductImage uris={['a', 'b', 'c']} active />));
    expect(last()).toBe('a');
    await act(async () => { jest.advanceTimersByTime(ROTATION_MS); });
    expect(last()).toBe('b');
    await act(async () => { jest.advanceTimersByTime(ROTATION_MS); });
    expect(last()).toBe('c');
    await act(async () => { jest.advanceTimersByTime(ROTATION_MS); });
    expect(last()).toBe('a');
  });

  it('does not turn when the card is off screen, has one picture, or the system asks for less motion', async () => {
    await render(wrap(<RotatingProductImage uris={['a', 'b']} active={false} />));
    await act(async () => { jest.advanceTimersByTime(ROTATION_MS * 3); });
    expect(last()).toBe('a');
    mockShown.length = 0;
    await render(wrap(<RotatingProductImage uris={['only']} active />));
    await act(async () => { jest.advanceTimersByTime(ROTATION_MS * 3); });
    expect(last()).toBe('only');
    setReduceMotionForTest(true);
    mockShown.length = 0;
    await render(wrap(<RotatingProductImage uris={['x', 'y']} active />));
    await act(async () => { jest.advanceTimersByTime(ROTATION_MS * 3); });
    expect(last()).toBe('x');
  });

  it('the picture after the last is the first', () => {
    expect(nextIndex(0, 3)).toBe(1);
    expect(nextIndex(2, 3)).toBe(0);
    expect(nextIndex(0, 0)).toBe(0);
  });
});
