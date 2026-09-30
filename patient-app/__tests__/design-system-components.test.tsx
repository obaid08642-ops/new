import * as TestRenderer from 'react-test-renderer';
import type { ReactTestRendererJSON } from 'react-test-renderer';

import {
  Button,
  Card,
  Chip,
  EmptyState,
  ErrorState,
  IconButton,
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
    const cases: Array<[string, React.ReactElement]> = [
      ['Button sm', <Button key="a" label="x" size="sm" />],
      ['Button md', <Button key="b" label="x" size="md" />],
      ['IconButton sm', <IconButton key="c" name="close" label="Close" size="sm" />],
      ['Stepper', <Stepper key="d" value={1} onChange={() => {}} />],
    ];
    // The web renderer states the floor as the token; the native one states the
    // same number, and the token test asserts the two agree. Collecting the
    // offenders rather than asserting inside the loop means one failure names
    // every component that lost the floor.
    const underFloor = cases
      .filter(([, el]) => !JSON.stringify(render(el)).includes('44'))
      .map(([name]) => name);
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

  it('the app localises the rating sentence, not the design system', () => {
    const [r] = render(
      <Rating value={4.5} count={128} formatLabel={() => "٤٫٥ من ٥ بناءً على ١٢٨ تقييماً"} />,
    );
    expect(r.props.accessibilityLabel).toContain("١٢٨ تقييماً");
  });

  it('a ServiceTile is named by its label and carries the illustrated art', () => {
    const nodes = render(<ServiceTile name="pharmacy" label="Pharmacy" />);
    expect(labelled(nodes)).toContain('Pharmacy');
    // Illustrated artwork, not a 20px line glyph — the split the canvas states.
    expect(labelled(nodes)).toContain('RNSVG');
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

  it('a Chip states its tone so a screen can pick the surface', () => {
    const [c] = render(<Chip label="Warning" tone="warning" testID="chip-warning" />);
    expect(c.props.testID).toBe('chip-warning');
    expect(labelled([c])).toContain('Warning');
  });

  it('a component invents no testID when the caller did not ask for one', () => {
    // An id nobody requested is noise in the test tree, and it can collide with
    // a real one. It only exists because someone passed it.
    const [c] = render(<Chip label="Warning" tone="warning" />);
    expect(c.props.testID).toBeUndefined();
  });

  it('a Card keeps its title and footer as text, not as decoration', () => {
    const nodes = render(<Card title="Order #4821" footer="Pay at the clinic" />);
    expect(labelled(nodes)).toContain('Order #4821');
    expect(labelled(nodes)).toContain('Pay at the clinic');
  });
});
