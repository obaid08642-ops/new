import React from 'react';
import { Dimensions, StyleSheet, Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { NHeader, NBottomNav, NScroll, NSheet, NConfirm, NBtn, HEADER_BAR_MIN, BOTTOM_NAV_MIN } from '../ui';

// DEVICE_STANDARD §2 matrix. Insets are mocked (a unit test has no native window); the assertions prove the
// shared components read them and apply them. They do NOT prove pixel placement on a real device.
type Device = { name: string; w: number; h: number; insets: { top: number; bottom: number; left: number; right: number } };
const DEVICES: Device[] = [
  { name: 'iPhone SE 375x667', w: 375, h: 667, insets: { top: 20, bottom: 0, left: 0, right: 0 } },
  { name: 'iPhone 15 Pro 393x852', w: 393, h: 852, insets: { top: 59, bottom: 34, left: 0, right: 0 } },
  { name: 'small Android 360x640 (status 24, nav bar 48)', w: 360, h: 640, insets: { top: 24, bottom: 48, left: 0, right: 0 } },
  { name: 'tablet 820x1180', w: 820, h: 1180, insets: { top: 24, bottom: 20, left: 0, right: 0 } },
  { name: 'iPhone 15 Pro landscape 852x393', w: 852, h: 393, insets: { top: 0, bottom: 21, left: 59, right: 59 } },
];

let mockInsets = DEVICES[0].insets;
let mockRTL = false;

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => mockInsets,
}));
jest.mock('../../context', () => {
  const theme = new Proxy({}, { get: () => '#123456' });
  return {
    useTheme: () => ({ theme, isDark: false }),
    useLang: () => ({ lang: mockRTL ? 'ar' : 'en', isRTL: mockRTL, t: (k: string) => k, setLang: jest.fn() }),
    useToast: () => ({ show: jest.fn() }),
  };
});

const flat = (node: any) => StyleSheet.flatten(node.props.style) as any;
const setDevice = (d: Device) => {
  mockInsets = d.insets;
  Dimensions.set({ window: { width: d.w, height: d.h, scale: 3, fontScale: 1 }, screen: { width: d.w, height: d.h, scale: 3, fontScale: 1 } });
};

const tabs = [
  { key: 'home', icon: 'home', label: 'Home', badge: 3 },
  { key: 'wallet', icon: 'wallet', label: 'Wallet' },
];

beforeEach(() => { mockRTL = false; });

describe.each(DEVICES)('shared components on $name', (d) => {
  beforeEach(() => setDevice(d));

  it('NHeader keeps content below the top inset with a 44pt minimum bar', async () => {
    await render(<NHeader title="T" onBack={() => {}} />);
    const bar = screen.getByTestId('nheader-bar');
    expect(flat(bar).minHeight).toBe(HEADER_BAR_MIN);
    expect(HEADER_BAR_MIN).toBeGreaterThanOrEqual(44);
    const root = bar.parent as any;
    const st = flat(root);
    expect(st.paddingTop).toBe(d.insets.top);
    expect(st.paddingLeft).toBe(d.insets.left);
    expect(st.paddingRight).toBe(d.insets.right);
  });

  it('NBottomNav is 56 + bottom inset and clears the home indicator / gesture bar', async () => {
    await render(<NBottomNav tabs={tabs} active="home" onPress={() => {}} />);
    const bar = flat(screen.getByTestId('nbottomnav'));
    const row = flat(screen.getByTestId('nbottomnav-row'));
    expect(bar.paddingBottom).toBe(d.insets.bottom);
    expect(row.minHeight).toBe(BOTTOM_NAV_MIN);
    expect(row.minHeight + bar.paddingBottom).toBe(56 + d.insets.bottom);
    expect(bar.paddingLeft).toBe(d.insets.left);
    expect(bar.paddingRight).toBe(d.insets.right);
  });

  it('NScroll pads top/bottom by the insets, keeps taps and avoids the keyboard', async () => {
    await render(<NScroll><Text>x</Text></NScroll>);
    const sv = screen.getByTestId('nscroll');
    const c = StyleSheet.flatten(sv.props.contentContainerStyle) as any;
    expect(c.paddingTop).toBe(Math.max(d.insets.top, 20));
    expect(c.paddingBottom).toBe(Math.max(48, d.insets.bottom + 20));
    expect(c.paddingLeft).toBeGreaterThanOrEqual(d.insets.left);
    expect(sv.props.keyboardShouldPersistTaps).toBe('handled');
    expect(sv.props.automaticallyAdjustKeyboardInsets).toBe(true);
  });

  it('NSheet respects the top inset (max height) and adds the bottom inset', async () => {
    await render(<NSheet visible onClose={() => {}} title="S" height={5000}><Text>c</Text></NSheet>);
    const st = flat(screen.getByTestId('nsheet'));
    expect(st.maxHeight).toBe(d.h - d.insets.top - 20);
    expect(st.height).toBe(st.maxHeight); // oversize request is clamped
    expect(st.paddingBottom).toBe(20 + d.insets.bottom);
  });

  it('NSheet default height is 65% of the live window', async () => {
    await render(<NSheet visible onClose={() => {}}><Text>c</Text></NSheet>);
    expect(flat(screen.getByTestId('nsheet')).height).toBeCloseTo(Math.min(d.h * 0.65, d.h - d.insets.top - 20), 5);
  });

  it('NConfirm is inset-padded and capped in width on wide screens', async () => {
    await render(<NConfirm visible title="a" msg="b" onOk={() => {}} onCancel={() => {}} />);
    const host = flat(screen.getByTestId('nconfirm-host'));
    expect(host.paddingTop).toBe(24 + d.insets.top);
    expect(host.paddingBottom).toBe(24 + d.insets.bottom);
    const widths: number[] = [];
    let n: any = screen.getByText('a');
    while (n) { const w = flat(n)?.width; if (typeof w === 'number') widths.push(w); n = n.parent; }
    expect(widths).toContain(Math.min(d.w - 48, 480));
  });
});

describe('RTL and font scale', () => {
  beforeEach(() => setDevice(DEVICES[1]));

  it('NHeader back arrow mirrors in RTL and the bar row reverses', async () => {
    mockRTL = true;
    await render(<NHeader title="T" onBack={() => {}} />);
    expect(screen.getByText('→')).toBeTruthy();
    expect(flat(screen.getByTestId('nheader-bar')).flexDirection).toBe('row-reverse');
  });

  it('NHeader back arrow points left in LTR', async () => {
    await render(<NHeader title="T" onBack={() => {}} />);
    expect(screen.getByText('←')).toBeTruthy();
    expect(flat(screen.getByTestId('nheader-bar')).flexDirection).toBe('row');
  });

  it('NBottomNav row reverses in RTL', async () => {
    mockRTL = true;
    await render(<NBottomNav tabs={tabs} active="home" onPress={() => {}} />);
    expect(flat(screen.getByTestId('nbottomnav-row')).flexDirection).toBe('row-reverse');
  });

  it('NBtn grows with the text: minHeight, never a fixed height', async () => {
    await render(<NBtn label="OK" onPress={() => {}} />);
    const t = screen.getByText('OK');
    let n: any = t;
    let found: any;
    while (n && !found) { const s = flat(n); if (s && s.minHeight) found = s; n = n.parent; }
    expect(found.minHeight).toBe(52);
    expect(found.height).toBeUndefined();
    expect(t.props.allowFontScaling).not.toBe(false);
  });
});
