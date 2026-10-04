import * as React from 'react';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as TestRenderer from 'react-test-renderer';
import type { ReactTestInstance } from 'react-test-renderer';

import { AppHeader, Screen, StickyFooter, TabBar, shellTokens } from '../../packages/ui-native/src';

/**
 * DEVICE_STANDARD §1 — the native shells. What has to hold on every device:
 *  - insets come from react-native-safe-area-context and land where §1 says
 *    (top on the header, bottom on the footer/tab bar, otherwise on the screen);
 *  - the CTA bar is content + max(bottom inset, 16);
 *  - touch targets are at least 44, with an accessible name;
 *  - the back chevron points the way the reader goes back in RTL and LTR;
 *  - colours come from the tokens, not literals.
 */

const IPHONE_15_PRO = { frame: { x: 0, y: 0, width: 393, height: 852 }, insets: { top: 59, bottom: 34, left: 0, right: 0 } };
const NO_INSETS = { frame: { x: 0, y: 0, width: 360, height: 640 }, insets: { top: 0, bottom: 0, left: 0, right: 0 } };

function mount(el: React.ReactElement, metrics = IPHONE_15_PRO): ReactTestInstance {
  let tree!: TestRenderer.ReactTestRenderer;
  TestRenderer.act(() => {
    tree = TestRenderer.create(<SafeAreaProvider initialMetrics={metrics}>{el}</SafeAreaProvider>);
  });
  return tree.root;
}

const flat = (style: unknown): Record<string, unknown> =>
  Array.isArray(style) ? Object.assign({}, ...style.flat(Infinity).filter(Boolean).map(flat)) : ((style as Record<string, unknown>) ?? {});
const byTestId = (root: ReactTestInstance, id: string) => root.find((n) => n.props.testID === id && typeof n.type === 'string');
const light = shellTokens('light');

describe('native shells (DEVICE_STANDARD §1)', () => {
  it('Screen pads the insets nobody else owns', () => {
    const bare = mount(<Screen testID="s"><Text>body</Text></Screen>);
    const bareBody = bare.findAll((n) => typeof n.type === 'string' && flat(n.props.style).paddingTop === 59);
    expect(bareBody.length).toBeGreaterThan(0);
    expect(flat(byTestId(bare, 's').props.style).backgroundColor).toBe(light.canvas);

    // with a header the top inset is the header's, with a footer the bottom one is the footer's
    const owned = mount(
      <Screen testID="s" header={<AppHeader title="t" testID="h" />} footer={<StickyFooter testID="f"><Text>cta</Text></StickyFooter>}>
        <Text>body</Text>
      </Screen>,
    );
    expect(flat(byTestId(owned, 'h').props.style).paddingTop).toBe(59);
    expect(flat(byTestId(owned, 'f').props.style).paddingBottom).toBe(34);
    const doubled = owned.findAll((n) => typeof n.type === 'string' && n.props.testID !== 'h' && flat(n.props.style).paddingTop === 59);
    expect(doubled).toHaveLength(0);
  });

  it('Screen with a function header tells it when content scrolled under it', () => {
    const seen: boolean[] = [];
    mount(
      <Screen scroll header={({ scrolled }) => { seen.push(scrolled); return <AppHeader title="t" scrolled={scrolled} />; }}>
        <Text>body</Text>
      </Screen>,
    );
    expect(seen[0]).toBe(false);
  });

  it('StickyFooter is content + max(bottom inset, 16)', () => {
    expect(flat(byTestId(mount(<StickyFooter testID="f"><Text>cta</Text></StickyFooter>), 'f').props.style).paddingBottom).toBe(34);
    expect(flat(byTestId(mount(<StickyFooter testID="f"><Text>cta</Text></StickyFooter>, NO_INSETS), 'f').props.style).paddingBottom).toBe(16);
    expect(flat(byTestId(mount(<StickyFooter testID="f"><Text>cta</Text></StickyFooter>), 'f').props.style).backgroundColor).toBe(light.glassCanvas);
    // the handoff CTA bars (Cart, CheckoutV2, RxUpload, BookingConfirm): the canvas colour at 86%
    expect(light.glassCanvas).toBe('rgba(245,245,247,0.86)');
  });

  it('AppHeader: 44pt back button with a name, chevron mirrored for RTL, glass only when scrolled', () => {
    const chevron = (direction: 'ltr' | 'rtl') => {
      const root = mount(<AppHeader title="t" onBack={() => undefined} backLabel="رجوع" direction={direction} />);
      const back = root.find((n) => n.props.accessibilityLabel === 'رجوع' && n.props.accessibilityRole === 'button');
      const box = flat(back.props.style);
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
      return root.find((n) => typeof n.props.d === 'string').props.d as string;
    };
    expect(chevron('rtl')).toBe('M9 6l6 6-6 6');
    expect(chevron('ltr')).toBe('M15 6l-6 6 6 6');

    const resting = flat(byTestId(mount(<AppHeader title="t" testID="h" />), 'h').props.style);
    const scrolled = flat(byTestId(mount(<AppHeader title="t" testID="h" scrolled />), 'h').props.style);
    expect(resting.backgroundColor).toBe('transparent');
    expect(scrolled.backgroundColor).toBe(light.glass);
  });

  it('TabBar: a named tablist, 52pt items, the active one is the ink pill with its label, the raised one is the coral button', () => {
    const items = ['home', 'pharmacy', 'consult', 'labs', 'nursing'].map((key) => ({
      key,
      label: key,
      raised: key === 'consult',
      icon: (color: string) => <Text testID={`icon-${key}`}>{color}</Text>,
    }));
    const root = mount(<TabBar testID="bar" label="التنقل الرئيسي" items={items} value="home" onChange={() => undefined} />);
    const bar = byTestId(root, 'bar');
    expect(bar.props.accessibilityRole).toBe('tablist');
    expect(bar.props.accessibilityLabel).toBe('التنقل الرئيسي');
    expect(flat(bar.props.style).bottom).toBe(34);

    // the Pressable itself: the one element whose style is the pressed-state function
    const tabs = root.findAll((n) => n.props.accessibilityRole === 'tab' && typeof n.props.style === 'function');
    expect(tabs).toHaveLength(5);
    for (const tab of tabs) {
      const box = flat(tab.props.style({ pressed: false }));
      expect(Number(box.height)).toBeGreaterThanOrEqual(44);
      expect(tab.props.accessibilityLabel).toBeTruthy();
    }
    const active = tabs.find((t) => t.props.accessibilityState?.selected)!;
    expect(flat(active.props.style({ pressed: false })).backgroundColor).toBe(light.selectedBg);
    // only the active tab shows its label
    expect(root.findAll((n) => n.type === Text && n.props.children === 'home')).toHaveLength(1);
    expect(root.findAll((n) => n.type === Text && n.props.children === 'pharmacy')).toHaveLength(0);
    // the raised button draws the fab gradient from the tokens and a white glyph
    const stops = root.findAll((n) => n.props.stopColor !== undefined && typeof n.type !== 'string').map((n) => n.props.stopColor);
    expect(stops).toEqual([light.fabFrom, light.fabTo]);
    expect(root.find((n) => n.props.testID === 'icon-consult' && typeof n.type !== 'string').props.children).toBe(light.fabFg);
  });

  it('never uses React Native SafeAreaView or physical left/right in the shells', () => {
    const dir = join(__dirname, '../../packages/ui-native/src/shells');
    for (const file of readdirSync(dir)) {
      const src = readFileSync(join(dir, file), 'utf8');
      expect(src).not.toMatch(/import\s*\{[^}]*\bSafeAreaView\b[^}]*\}\s*from\s*['"]react-native['"]/);
      expect(src).not.toMatch(/(?<![.\w])(marginLeft|marginRight|paddingLeft|paddingRight|left|right)\s*:/);
      expect(src).not.toMatch(/#[0-9A-Fa-f]{3,8}\b/);
    }
  });
});
