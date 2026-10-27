jest.mock('react-native-localize', () => require('react-native-localize/mock'));
import { Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as TestRenderer from 'react-test-renderer';

import { AppHeader, Badge } from '../../packages/ui-native/src';
import { formatNumber } from '../src/components/screen/ScreenKit';
import { numberingFor, dateFormatterFor } from '../src/utils/dates';
import { slotBarLabel } from '../src/utils/doctorSummary';

const METRICS = { frame: { x: 0, y: 0, width: 360, height: 640 }, insets: { top: 0, bottom: 0, left: 0, right: 0 } };

function mount(el: React.ReactElement) {
  let tree!: TestRenderer.ReactTestRenderer;
  TestRenderer.act(() => {
    tree = TestRenderer.create(<SafeAreaProvider initialMetrics={METRICS}>{el}</SafeAreaProvider>);
  });
  return tree;
}

/** Fires the layout event of every node that listens to it, as the device would after measuring. */
function layout(tree: TestRenderer.ReactTestRenderer, width: number, endWidth: number) {
  TestRenderer.act(() => {
    for (const n of tree.root.findAll((x) => typeof x.type === 'string' && typeof x.props.onLayout === 'function')) {
      // the row has no width of its own to report: the end group is the one with the buttons
      const isRow = String(JSON.stringify(n.props.style)).includes('"minHeight":44') && String(JSON.stringify(n.props.style)).includes('"gap":10');
      n.props.onLayout({ nativeEvent: { layout: { x: 0, y: 0, width: isRow ? width : endWidth, height: 44 } } });
    }
  });
}

const titleCount = (tree: TestRenderer.ReactTestRenderer) => tree.root.findAll((n) => typeof n.type === 'string' && n.type === 'Text' && JSON.stringify(n.props.children) === '"Consultations"').length;
const row = (tree: TestRenderer.ReactTestRenderer) => tree.root.findAll((n) => n.props.accessibilityRole === 'header' && typeof n.type === 'string' && n.type === 'View')[0];

describe('AppHeader title never shares a row it cannot fit', () => {
  const trailing = <View><Text>buttons</Text></View>;

  it('keeps the title between the buttons when there is room', () => {
    const tree = mount(<AppHeader title="Consultations" onBack={() => undefined} trailing={trailing} />);
    layout(tree, 344, 44);
    const outer = row(tree);
    // title in the main row: the header has one child row only
    expect(outer.children.filter((c) => typeof c !== 'string')).toHaveLength(1);
    expect(titleCount(tree)).toBe(1);
  });

  it('moves the title to its own full-width row when four buttons leave under 150pt (360 and 390 wide)', () => {
    for (const width of [344, 374]) {
      const tree = mount(<AppHeader title="Consultations" onBack={() => undefined} trailing={trailing} />);
      layout(tree, width, 200);
      const outer = row(tree);
      expect(outer.children.filter((c) => typeof c !== 'string')).toHaveLength(2);
      expect(titleCount(tree)).toBe(1);
    }
  });
});

describe('one numbering system per language', () => {
  it('Bengali uses Bengali digits for counts, prices, dates and times; the others keep Latin digits', () => {
    expect(formatNumber(12, 'bn')).toBe('১২');
    expect(formatNumber(1250.5, 'bn', { minimumFractionDigits: 2 })).toMatch(/^[০-৯,.]+$/);
    expect(numberingFor('bn')).toBe('beng');
    expect(numberingFor('bn-BD-u-ca-gregory')).toBe('beng');
    for (const lang of ['ar', 'en', 'ur', 'hi', 'fil']) {
      expect(numberingFor(lang)).toBe('latn');
      expect(formatNumber(12, lang)).toBe('12');
    }
    const bn = dateFormatterFor('bn');
    const stamp = new Date(2026, 9, 30, 17, 30);
    expect(bn.fmtDate(stamp, { day: 'numeric', month: 'long', year: 'numeric' })).not.toMatch(/[0-9]/);
    expect(bn.fmtTime(stamp)).not.toMatch(/[0-9]/);
    expect(dateFormatterFor('en').fmtDate(stamp)).toMatch(/[0-9]/);
    expect(slotBarLabel('bn-BD-u-ca-gregory', stamp.toISOString(), undefined)).not.toMatch(/[0-9]/);
  });

  it('Badge writes its count through the formatter given, and the cap too', () => {
    const text = (tree: TestRenderer.ReactTestRenderer) => tree.root.findAll((n) => n.type === Text)[0].props.children;
    expect(text(mount(<Badge content={3} format={(n) => formatNumber(n, 'bn')} />))).toBe('৩');
    expect(text(mount(<Badge content={150} format={(n) => formatNumber(n, 'bn')} />))).toBe('৯৯+');
    expect(text(mount(<Badge content={3} />))).toBe('3');
  });
});
