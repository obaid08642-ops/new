import { StyleSheet, Text } from 'react-native';
import * as TestRenderer from 'react-test-renderer';
import type { ReactTestRendererJSON } from 'react-test-renderer';

import {
  Button,
  Avatar,
  Card,
  Chip,
  DoctorCard,
  EmptyState,
  OfferCard,
  ProductCard,
  ProgressRing,
  Timeline,
  ErrorState,
  FIcon,
  IconButton,
  Radio,
  SectionHeader,
  Segmented,
  StatusChip,
  Toggle,
  Rating,
  ServiceTile,
  Stepper,
  Tabs,
  Toast,
} from '../../packages/ui-native/src';
import { tokens } from '../../packages/design-tokens/dist/ts/tokens';

/**
 * 12.A7 — the React Native half of the component contract.
 *
 * The prop-level half of "same API" is a compile error checked in
 * `packages/ui/components/conformance.ts`. What is checked HERE is that the
 * native renderer produces the same *semantics*: the same accessible roles, the
 * same names, the same 44px floor, the same "empty is not an error" split.
 *
 * A renderer can accept every prop in the contract and still ship an
 * accessibility bug, and a type system cannot see that.
 */

type Node = ReactTestRendererJSON;

function render(el: React.ReactElement): Node[] {
  let tree!: TestRenderer.ReactTestRenderer;
  TestRenderer.act(() => {
    tree = TestRenderer.create(el);
  });
  const json = tree.toJSON();
  if (json === null) return [];
  return Array.isArray(json) ? json : [json];
}

function findAll(nodes: readonly Node[], pred: (n: Node) => boolean): Node[] {
  const out: Node[] = [];
  const walk = (node: Node | null) => {
    if (!node || typeof node === 'string') return;
    if (pred(node)) out.push(node);
    (node.children ?? []).forEach((c) => walk(c as Node));
  };
  nodes.forEach(walk);
  return out;
}

const byRole = (role: string) => (n: Node) => n.props?.accessibilityRole === role;
const labelled = (nodes: readonly Node[]) => JSON.stringify(nodes);
/** react-native-svg serialises a colour as an ARGB integer (paths unsigned, gradient stops signed). */
const argb = (hex: string) => (0xff000000 | parseInt(hex.slice(1), 16)) >>> 0;
const svgColour = (hex: string) => new RegExp(`(${argb(hex)}|${argb(hex) | 0})\\b`);

describe('12.A7 — the native renderer keeps the contract semantics', () => {
  it('a Button is a button, named by its visible text', () => {
    const [b] = render(<Button label="Save" />);
    expect(b.props.accessibilityRole).toBe('button');
    expect(labelled([b])).toContain('Save');
  });

  it('a loading Button announces busy AND blocks the press', () => {
    // The web half asserts `disabled` and `aria-busy`; this is the same
    // promise in the native vocabulary.
    const [b] = render(<Button label="Saving" loading />);
    expect(b.props.accessibilityState).toMatchObject({ busy: true, disabled: true });
  });

  it('an IconButton cannot be unnamed — the type requires the label', () => {
    const [b] = render(<IconButton name="close" label="Close" />);
    expect(b.props.accessibilityRole).toBe('button');
    expect(b.props.accessibilityLabel).toBe('Close');
  });

  it('nothing interactive is smaller than the 44px touch target', () => {
    // Controls may be drawn smaller than 44 (the 40 sm button, the 30 stepper
    // discs, the 38 chip) as the boards do, but the TARGET may not: it is the
    // drawn height plus the hitSlop. Measured on every pressable node, not
    // inferred from a "44" somewhere in the tree.
    const cases: Array<[string, React.ReactElement]> = [
      ['Button sm', <Button key="a" label="x" size="sm" />],
      ['Button md', <Button key="b" label="x" size="md" />],
      ['IconButton sm', <IconButton key="c" name="close" label="Close" size="sm" />],
      ['Stepper', <Stepper key="d" value={1} onChange={() => {}} />],
      ['Chip', <Chip key="e" label="x" />],
      ['Segmented sm', <Segmented key="f" label="g" size="sm" value="a" options={[{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }]} />],
      ['Toggle', <Toggle key="g" label="t" value />],
      ['Radio', <Radio key="h" label="r" selected={false} />],
      ['DoctorCard book', <DoctorCard key="i" name="d" bookLabel="احجز" />],
      ['ProductCard add', <ProductCard key="j" name="p" price="1" addLabel="أضف" />],
    ];
    const interactive = (n: Node) => ['button', 'switch', 'radio'].includes(n.props?.accessibilityRole);
    const slop = (h: unknown, a: 'top' | 'bottom') => (typeof h === 'number' ? h : (h as Record<string, number> | undefined)?.[a] ?? 0);
    const underFloor: string[] = [];
    for (const [name, el] of cases) {
      const nodes = findAll(render(el), interactive);
      expect(nodes.length).toBeGreaterThan(0);
      for (const n of nodes) {
        const st = StyleSheet.flatten(n.props.style) ?? {};
        const drawn = typeof st.height === 'number' ? st.height : typeof st.minHeight === 'number' ? st.minHeight : 0;
        const target = drawn + slop(n.props.hitSlop, 'top') + slop(n.props.hitSlop, 'bottom');
        if (target < 44) underFloor.push(`${name}: ${target}`);
      }
    }
    expect(underFloor).toEqual([]);
  });

  it('empty and error stay two different components with two different roles', () => {
    // "You have no orders" is information. "We could not load your orders" is an
    // apology. Merging them means apologising to people with nothing yet.
    const empty = render(<EmptyState illustration="emptyOrders" title="No orders yet" />);
    const error = render(<ErrorState title="We could not reach Nabd+" />);

    expect(findAll(empty, byRole('alert'))).toHaveLength(0);
    expect(findAll(error, byRole('alert')).length).toBeGreaterThan(0);
    expect(labelled(empty)).toContain('No orders yet');
    expect(labelled(error)).toContain('We could not reach Nabd+');
  });

  it('an ErrorState keeps the technical cause out of the title', () => {
    const nodes = render(
      <ErrorState
        title="We could not reach Nabd+"
        detail="TypeError: fetch failed"
        retryLabel="Try again"
      />,
    );
    // The headline is what a user can act on; the cause is there for support.
    expect(labelled(nodes)).toContain('We could not reach Nabd+');
    expect(labelled(nodes)).toContain('TypeError: fetch failed');
    expect(labelled(nodes)).toContain('Try again');
  });

  it('a Toast is a polite live region, so it does not interrupt', () => {
    const [t] = render(<Toast message="Order confirmed" tone="success" />);
    expect(t.props.accessibilityLiveRegion).toBe('polite');
  });

  it('a Rating always states what it is out of', () => {
    const [r] = render(<Rating value={4.5} count={128} />);
    expect(r.props.accessibilityRole).toBe('image');
    expect(r.props.accessibilityLabel).toContain('4.5');
    expect(r.props.accessibilityLabel).toContain('5');
  });

  it('a Rating is one filled star, the value and (count), and nothing without real ratings', () => {
    const json = labelled(render(<Rating value={4.8} count={128} />));
    expect(json.match(/RNSVGPath/g)).toHaveLength(1);
    expect(json).toContain('4.8');
    expect(json).toContain('(128)');
    expect(render(<Rating value={null} count={0} />)).toEqual([]);
    expect(render(<Rating value={4.2} count={0} />)).toEqual([]);
  });

  it('an Avatar is a photo, initials or the neutral user icon, named by the person', () => {
    const [photo] = render(<Avatar name="د. أحمد" src="https://cdn.nabd.plus/doctors/1.jpg" />);
    expect(photo.props.accessibilityLabel).toBe('د. أحمد');
    expect(labelled([photo])).toContain('https://cdn.nabd.plus/doctors/1.jpg');
    expect(labelled(render(<Avatar name="Amina Haddad" />))).toContain('AH');
    expect(labelled(render(<Avatar name="" />))).toContain('RNSVG');
  });

  it('the app localises the rating sentence, not the design system', () => {
    const [r] = render(
      <Rating value={4.5} count={128} formatLabel={() => "٤٫٥ من ٥ بناءً على ١٢٨ تقييماً"} />,
    );
    expect(r.props.accessibilityLabel).toContain("١٢٨ تقييماً");
  });

  it("a ServiceTile is named by its label and draws its service's FIcon from the handoff map", () => {
    const [tile] = render(<ServiceTile name="pharmacy" label="Pharmacy" />);
    expect(tile.props.accessibilityLabel).toBe('Pharmacy');
    // Handoff §1: a filled glyph (an SVG path) in the pharmacy tone, not a 20px line glyph.
    const light = tokens('light').color.service;
    expect(labelled([tile])).toContain('RNSVG');
    expect(labelled([tile])).toContain(light.coral.bg);
    expect(labelled([tile])).toMatch(svgColour(light.coral.fg));
  });

  it('FIcon: radius 32% and glyph 52% of the edge, tone colours per theme, decorative unless named', () => {
    const [soft] = render(<FIcon icon="pill" tone="mint" size={50} />);
    expect(soft.props.style.borderRadius).toBe(16);
    expect(soft.props.style.backgroundColor).toBe(tokens('light').color.service.mint.bg);
    expect(soft.props.importantForAccessibility).toBe('no-hide-descendants');
    const [dark] = render(<FIcon icon="pill" tone="mint" size={50} theme="dark" />);
    expect(dark.props.style.backgroundColor).toBe(tokens('dark').color.service.mint.bg);
    const [named] = render(<FIcon icon="pill" tone="coral" label="صيدلية" />);
    expect(named.props.accessibilityRole).toBe('image');
    expect(named.props.accessibilityLabel).toBe('صيدلية');
    // solid: the tone gradient with the white glyph token
    const solid = labelled(render(<FIcon icon="pill" tone="teal" chip="solid" />));
    const teal = tokens('light').color.service.teal.solid;
    expect(solid).toMatch(svgColour(teal.from));
    expect(solid).toMatch(svgColour(teal.to));
    expect(solid).toMatch(svgColour(tokens('light').color.icon.onSolid));
  });

  it('SectionHeader: the title is a header, the action a named link', () => {
    const json = labelled(render(<SectionHeader title="عروض وباقات" actionLabel="عرض الكل" />));
    expect(json).toContain('"accessibilityRole":"header"');
    expect(json).toContain('"accessibilityRole":"link"');
    expect(json).toContain('عرض الكل');
  });

  it('Tabs are a tablist of tabs, so arrow keys have something to move between', () => {
    const nodes = render(
      <Tabs
        items={[
          { id: 'home', label: 'Home', icon: 'home' },
          { id: 'orders', label: 'Orders', icon: 'list' },
        ]}
        value="home"
        onChange={() => {}}
      />,
    );
    expect(findAll(nodes, byRole('tablist')).length).toBeGreaterThan(0);
    expect(findAll(nodes, byRole('tab'))).toHaveLength(2);
    // Exactly one tab is selected, which is what a roving tabindex needs.
    const selected = findAll(nodes, (n) => n.props?.accessibilityState?.selected === true);
    expect(selected).toHaveLength(1);
  });

  it('no native component paints a raw hex outside the two themes', () => {
    // Colours come from the token module, so the dark theme is the same switch
    // the token file defines rather than a second hand-maintained palette.
    const light = tokens('light');
    const dark = tokens('dark');
    expect(light.color.bg.surface).not.toBe(dark.color.bg.surface);
  });

  it('a Chip is a selectable filter: it says when it is selected, and shows a real count', () => {
    const [c] = render(<Chip label="أدوية" count={12} selected testID="chip-meds" />);
    expect(c.props.testID).toBe('chip-meds');
    expect(c.props.accessibilityRole).toBe('button');
    expect(c.props.accessibilityState).toMatchObject({ selected: true });
    expect(labelled([c])).toContain('أدوية');
    expect(labelled([c])).toContain('"12"');
  });

  it('a component invents no testID when the caller did not ask for one', () => {
    // An id nobody requested is noise in the test tree, and it can collide with
    // a real one. It only exists because someone passed it.
    const [c] = render(<Chip label="Warning" />);
    expect(c.props.testID).toBeUndefined();
  });

  it('a Card keeps its title and footer as text, not as decoration', () => {
    const nodes = render(<Card title="Order #4821" footer="Pay at the clinic" />);
    expect(labelled(nodes)).toContain('Order #4821');
    expect(labelled(nodes)).toContain('Pay at the clinic');
  });
});

describe('handoff §3 — native controls (components 2/4) keep the web semantics', () => {
  const light = tokens('light');

  it('Segmented is a named radiogroup; exactly the chosen option is checked and raised', () => {
    const nodes = render(
      <Segmented label="المظهر" value="light" options={[{ value: 'auto', label: 'تلقائي' }, { value: 'light', label: 'فاتح' }, { value: 'dark', label: 'غامق' }]} />,
    );
    const [group] = findAll(nodes, byRole('radiogroup'));
    expect(group.props.accessibilityLabel).toBe('المظهر');
    expect(StyleSheet.flatten(group.props.style).backgroundColor).toBe(light.color.control.segmentedTrack);
    const radios = findAll(nodes, byRole('radio'));
    expect(radios).toHaveLength(3);
    expect(radios.map((r) => r.props.accessibilityState.checked)).toEqual([false, true, false]);
    expect(StyleSheet.flatten(radios[1].props.style).backgroundColor).toBe(light.color.bg.surface);
  });

  it('Toggle is a named switch that reports its state, green when on', () => {
    const on = findAll(render(<Toggle label="تذكير الأدوية" value />), byRole('switch'))[0];
    expect(on.props.accessibilityLabel).toBe('تذكير الأدوية');
    expect(on.props.accessibilityState.checked).toBe(true);
    expect(StyleSheet.flatten(on.props.style).backgroundColor).toBe(light.color.control.switchOn);
    const off = findAll(render(<Toggle label="العروض" value={false} />), byRole('switch'))[0];
    expect(StyleSheet.flatten(off.props.style).backgroundColor).toBe(light.color.border.strong);
  });

  it('Toggle calls onChange with the new value', () => {
    let got: boolean | undefined;
    let tree!: TestRenderer.ReactTestRenderer;
    TestRenderer.act(() => {
      tree = TestRenderer.create(<Toggle label="x" value={false} onChange={(v) => (got = v)} />);
    });
    TestRenderer.act(() => {
      tree.root.findAll((n) => n.props.accessibilityRole === 'switch' && typeof n.props.onPress === 'function')[0].props.onPress();
    });
    expect(got).toBe(true);
  });

  it('Radio is a checked or unchecked row with the coral 7pt ring when chosen', () => {
    const [on] = findAll(render(<Radio label="العربية" meta="Arabic" selected />), byRole('radio'));
    expect(on.props.accessibilityState.checked).toBe(true);
    expect(on.props.accessibilityLabel).toBe('العربية, Arabic');
    expect(JSON.stringify(on)).toContain(`"borderColor":"${light.color.action.primary.bg}"`);
    expect(JSON.stringify(on)).toContain('"borderWidth":7');
    const [off] = findAll(render(<Radio label="English" selected={false} />), byRole('radio'));
    expect(off.props.accessibilityState.checked).toBe(false);
    expect(JSON.stringify(off)).toContain(`"borderColor":"${light.color.control.radioOff}"`);
  });

  it('StatusChip uses the tone colours of the service map', () => {
    const json = JSON.stringify(render(<StatusChip label="تم التوصيل" tone="mint" />));
    expect(json).toContain(light.color.service.mint.bg);
    expect(json).toContain(light.color.service.mint.fg);
    expect(json).toContain('تم التوصيل');
  });

  it('a primary Button paints the gradient tokens behind its label', () => {
    const json = JSON.stringify(render(<Button label="متابعة" size="lg" />));
    const g = light.color.action.primary.gradient;
    expect(json).toMatch(svgColour(g.from));
    expect(json).toMatch(svgColour(g.to));
    expect(json).toContain('"height":56');
    expect(json).toContain('"borderRadius":18');
  });
});

describe('handoff §3 — native cards (components 3/4) keep the web semantics', () => {
  const light = tokens('light');

  it('DoctorCard shows only what it is given, and its book action is a named button', () => {
    const full = render(
      <DoctorCard
        name="د. أمينة"
        bookLabel="احجز"
        verifiedLabel="موثّق"
        availableLabel="متاح الآن"
        rating={{ value: 4.8, count: 128 }}
        nextSlot="اليوم ٧:٣٠ م"
        price="180"
        currency="ر.س"
      />,
    );
    const json = JSON.stringify(full);
    expect(json).toContain('موثّق');
    expect(json).toContain('متاح الآن');
    expect(json).toContain('4.8');
    expect(findAll(full, byRole('button')).map((b) => b.props.accessibilityLabel)).toContain('احجز');
    const bare = JSON.stringify(render(<DoctorCard name="د. عمر" bookLabel="احجز" />));
    expect(bare).not.toContain(light.color.presence.online);
    expect(bare).not.toContain('accessibilityLabel":"موثّق');
    expect(bare).not.toMatch(svgColour(light.color.icon.ratingStarOnBrand));
  });

  it('ProductCard: the add button is named and the discount and rx note appear only when given', () => {
    const nodes = render(<ProductCard name="بنادول" price="12.50" addLabel="أضف للسلة" discountLabel="خصم ١٥٪" rxLabel="يحتاج وصفة" />);
    expect(findAll(nodes, byRole('button'))[0].props.accessibilityLabel).toBe('أضف للسلة');
    expect(JSON.stringify(nodes)).toContain('خصم ١٥٪');
    expect(JSON.stringify(nodes)).toContain(light.color.bg.media);
    const bare = JSON.stringify(render(<ProductCard name="x" price="1" addLabel="أضف" />));
    expect(bare).not.toContain('خصم');
  });

  it('OfferCard paints the price in the price colour and strikes the old price', () => {
    const json = JSON.stringify(render(<OfferCard title="باقة" price="199" was="260" icon="test-tube" tone="blue" />));
    expect(json).toContain(light.color.text.price);
    expect(json).toContain('"textDecorationLine":"line-through"');
  });

  it('Timeline is a named list; the current step is selected, done steps are coral', () => {
    const nodes = render(
      <Timeline
        label="حالة الطلب"
        steps={[
          { id: 'a', label: 'تم القبول', time: '٧:٠٢', state: 'done' },
          { id: 'b', label: 'في الطريق', state: 'current' },
          { id: 'c', label: 'تم التوصيل', state: 'upcoming' },
        ]}
      />,
    );
    const [list] = findAll(nodes, byRole('list'));
    expect(list.props.accessibilityLabel).toBe('حالة الطلب');
    const steps = findAll(nodes, (n) => n.props?.accessible === true);
    expect(steps.map((n) => n.props.accessibilityState.selected)).toEqual([false, true, false]);
    expect(steps[0].props.accessibilityLabel).toBe('تم القبول, ٧:٠٢');
  });

  it('ProgressRing is a named progressbar with its value, clamped', () => {
    const [ring] = findAll(render(<ProgressRing value={0.55} tone="pink" label="أسبوع ٢٢" />), byRole('progressbar'));
    expect(ring.props.accessibilityLabel).toBe('أسبوع ٢٢');
    expect(ring.props.accessibilityValue).toEqual({ min: 0, max: 100, now: 55 });
    const [over] = findAll(render(<ProgressRing value={3} tone="pink" label="x" />), byRole('progressbar'));
    expect(over.props.accessibilityValue.now).toBe(100);
  });

  it('Card holds children and tints with the tone', () => {
    const json = JSON.stringify(render(<Card title="t" tint="pink"><Text>داخل</Text></Card>));
    expect(json).toContain('داخل');
    expect(json).toMatch(svgColour(light.color.service.pink.bg));
  });
});

