import * as React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as TestRenderer from 'react-test-renderer';

import { TabBar, type TabBarItem } from '../../packages/ui-native/src/shells/TabBar';
import * as TabBarModule from '../../packages/ui-native/src/shells/TabBar';

/**
 * Owner feedback 2026-10-30: the raised Consultations button and its transparent cut-out lined up only while the
 * Consultations tab was selected. The cut-out was centred on the bar (w / 2) but the button sits in its flex slot,
 * which moves when another tab is selected (that tab grows into a pill with a label).
 *
 * This test drives layout with onLayout events (a flex `space-between` row model with realistic widths), then reads
 * BOTH centres from what is rendered: the notch from the SVG path, the button from the slot it sits in.
 */

const KEYS = ['home', 'pharmacy', 'consult', 'labs', 'nursing'];
const LABELS: Record<string, string> = { home: 'Home', pharmacy: 'Pharmacy', consult: 'Consultations', labs: 'Labs & radiology', nursing: 'Nursing' };
const ITEMS: TabBarItem[] = KEYS.map((key) => ({ key, label: LABELS[key], raised: key === 'consult', icon: () => null }));
const ITEM = 52;
const PAD = 8;

/** Physical x / width of each slot for a `space-between` row, the selected non-raised tab widened by its label. */
function slots(barWidth: number, selected: string, fontScale: number, rtl: boolean): Record<string, { x: number; width: number }> {
  const widths = KEYS.map((k) => {
    if (k === 'consult' || k !== selected) return ITEM;
    return 18 * 2 + 24 + 8 + Math.ceil(LABELS[k].length * 7.2 * fontScale);
  });
  const free = barWidth - PAD * 2 - widths.reduce((a, b) => a + b, 0);
  const gap = free / (KEYS.length - 1);
  const out: Record<string, { x: number; width: number }> = {};
  let x = PAD;
  KEYS.forEach((k, i) => {
    out[k] = { x: rtl ? barWidth - x - widths[i] : x, width: widths[i] };
    x += widths[i] + gap;
  });
  return out;
}

/** x of the notch centre: the midpoint of the two points where the path's arc meets the top edge. */
function notchCentreOf(d: string): number {
  const m = d.match(/L ([\d.]+) 0\.5 A [\d.]+ [\d.]+ 0 1 0 ([\d.]+) 0\.5/);
  if (!m) throw new Error(`no notch in ${d}`);
  return (parseFloat(m[1]) + parseFloat(m[2])) / 2;
}

function mount(selected: string, screen: number, rtl: boolean, fontScale: number) {
  const barWidth = screen - 28;
  let r!: TestRenderer.ReactTestRenderer;
  TestRenderer.act(() => {
    r = TestRenderer.create(
      <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: screen, height: 844 }, insets: { top: 47, bottom: 34, left: 0, right: 0 } }}>
        <TabBar items={ITEMS} value={selected} onChange={() => undefined} direction={rtl ? 'rtl' : 'ltr'} testID="bar" />
      </SafeAreaProvider>,
    );
  });
  const root = r.root;
  const bar = root.find((n) => n.props.testID === 'bar' && typeof n.type === 'string');
  const geo = slots(barWidth, selected, fontScale, rtl);
  TestRenderer.act(() => {
    bar.props.onLayout({ nativeEvent: { layout: { x: 14, y: 0, width: barWidth, height: 68 } } });
  });
  // each slot reports its own layout (the harness fires it for every tab; the raised one is what the anchor reads)
  for (const key of KEYS) {
    const slot = root.findAll((n) => n.props.accessibilityLabel === LABELS[key] && n.props.accessibilityRole === 'tab' && typeof n.type === 'string')[0];
    if (slot?.props.onLayout) TestRenderer.act(() => slot.props.onLayout({ nativeEvent: { layout: { ...geo[key], y: 8, height: ITEM } } }));
  }
  const path = root.findAll((n) => typeof n.props.d === 'string' && n.props.d.startsWith('M 34 '))[0];
  return { notch: notchCentreOf(path.props.d), fab: geo.consult.x + geo.consult.width / 2, barWidth };
}

describe('TabBar: the cut-out and the raised button share one anchor', () => {
  const cases: [number, boolean, number][] = [];
  for (const screen of [320, 430]) for (const rtl of [false, true]) for (const fs of [1, 1.3]) cases.push([screen, rtl, fs]);

  it.each(cases)('width %i rtl=%s fontScale=%s: notch centre == button centre (<= 1 px) on all 5 tabs', (screen, rtl, fs) => {
    for (const tab of KEYS) {
      const { notch, fab } = mount(tab, screen, rtl, fs);
      expect(Math.abs(notch - fab)).toBeLessThanOrEqual(1);
    }
  });

  it('exports the pure helpers; both come from the slot centre', () => {
    const { fabCentre, notchCentre } = TabBarModule as unknown as {
      fabCentre: (s: { x: number; width: number } | null, w: number) => number;
      notchCentre: (s: { x: number; width: number } | null, w: number) => number;
    };
    expect(fabCentre({ x: 100, width: 52 }, 360)).toBe(126);
    expect(notchCentre({ x: 100, width: 52 }, 360)).toBe(126);
    expect(notchCentre(null, 360)).toBe(180);
  });

  it('the selected non-consult tab really moves the slot (the test reproduces the bug conditions)', () => {
    const { fab, barWidth } = mount('home', 390, false, 1);
    expect(Math.abs(fab - barWidth / 2)).toBeGreaterThan(5);
  });
});
