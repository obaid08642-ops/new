import * as TestRenderer from 'react-test-renderer';
import type { ReactTestRendererJSON } from 'react-test-renderer';

import { Icon, Illustration, ILLUSTRATION_NAMES, ILLUSTRATED_ICONS } from '../../packages/ui-native/src/Icon';
import { ILLUSTRATIONS, GRID } from '../../packages/ui/icons/illustrations';
import { ILLUSTRATED } from '../../packages/ui/icons/illustrated';
import { tokens } from '../../packages/design-tokens/dist/ts/tokens';

/**
 * 12.A6 — the React Native half of the icon/illustration contract.
 *
 * The point of the shared geometry is that the app and the website are the same
 * drawing, so this test does not check how the artwork looks — it checks that the
 * tree RN actually renders carries the same numbers as the source geometry. If
 * somebody redraws a scene in the RN component only, the count and the first path
 * both diverge and this fails.
 */

type Node = ReactTestRendererJSON;

/** toJSON() returns a bare object for a single root, so normalise to a list. */
function render(el: React.ReactElement): Node[] {
  let tree!: TestRenderer.ReactTestRenderer;
  TestRenderer.act(() => {
    tree = TestRenderer.create(el);
  });
  const json = tree.toJSON();
  if (json === null) return [];
  return Array.isArray(json) ? json : [json];
}

/**
 * Collect every numeric draw command in document order.
 *
 * react-native-svg resolves `Path`/`Circle`/`Rect` down to its native host
 * components, so the type names are the RNSVG* ones rather than the element names
 * the component file imports. Matching the suffix keeps this test tied to the
 * GEOMETRY, which is the thing the two platforms have to share, rather than to
 * react-native-svg's internal naming.
 */
function drawCommands(nodes: readonly Node[]): string[] {
  const out: string[] = [];
  const walk = (node: Node | null) => {
    if (!node || typeof node === 'string') return;
    const type = String(node.type);
    if (/Path$/.test(type) && typeof node.props.d === 'string') out.push(`d:${node.props.d}`);
    if (/Circle$/.test(type)) out.push(`circle:${node.props.cx},${node.props.cy},${node.props.r}`);
    if (/Rect$/.test(type)) {
      out.push(`rect:${node.props.x},${node.props.y},${node.props.width},${node.props.height},${node.props.rx}`);
    }
    (node.children ?? []).forEach((c) => walk(c as Node));
  };
  nodes.forEach(walk);
  return out;
}

/** react-native-svg hands colours to the native layer as an ARGB int payload. */
function argb(hex: string): number {
  return (0xff000000 | Number.parseInt(hex.replace('#', ''), 16)) >>> 0;
}

describe('12.A6 — @nabd/ui-native renders the shared geometry', () => {
  it('every scene draws the same commands as the source geometry', () => {
    for (const name of ILLUSTRATION_NAMES) {
      const source = ILLUSTRATIONS[name];
      const nodes = render(<Illustration name={name} size={128} />);
      const rendered = drawCommands(nodes);

      // Count the drawable leaves in the source, groups included.
      const leaves = ((): number => {
        const count = (prims: readonly unknown[]): number =>
          prims.reduce<number>((n, p) => {
            const el = (p as Record<string, unknown>).el;
            return n + (el === 'g' ? count((p as { children: unknown[] }).children) : 1);
          }, 0);
        return count(source);
      })();

      expect(rendered).toHaveLength(leaves);
      expect(rendered[0]).toBe(sourceFirstCommand(source));
    }
  });

  it('scenes use the 64 grid and icons the 48 grid', () => {
    // react-native-svg hands the host component vbWidth/vbHeight rather than the
    // raw viewBox string, so the grid is asserted on those.
    const scene = render(<Illustration name="emptyCart" size={128} />)[0];
    expect(GRID).toBe(64);
    expect(scene.props.vbWidth).toBe(GRID);
    expect(scene.props.vbHeight).toBe(GRID);
    expect(scene.props.width).toBe(128);

    const icon = render(<Icon name="pharmacy" weight="illustrated" size={76} />)[0];
    expect(icon.props.vbWidth).toBe(48);
    expect(icon.props.vbHeight).toBe(48);
  });

  it('is exposed to a screen reader only when it has a title', () => {
    const bare = render(<Illustration name="emptyCart" />)[0];
    expect(bare.props.accessibilityRole).toBe('none');
    expect(bare.props.accessibilityLabel).toBeUndefined();

    const titled = render(<Illustration name="emptyCart" title="السلة فارغة" />)[0];
    expect(titled.props.accessibilityRole).toBe('image');
    expect(titled.props.accessibilityLabel).toBe('السلة فارغة');
  });

  it('resolves artwork colours from the token module, not from CSS vars', () => {
    const nodes = render(<Illustration name="successOrder" size={128} />);
    // React Native has no custom properties, so a var() reaching the tree would
    // render as black. Asserting the ARGB payload is what the token module gives
    // is the real check: it proves the artwork went through `color.iconArt`.
    expect(JSON.stringify(nodes)).not.toContain('var(--');

    const mint = argb(tokens('light').color.iconArt.mint as unknown as string);
    const ink = argb(tokens('light').color.iconArt.ink as unknown as string);
    const paper = argb(tokens('light').color.iconArt.paper as unknown as string);

    const circles = collect(nodes, (n) => /Circle$/.test(String(n.type)));
    const fills = circles.map((n) => (n.props.fill as { payload?: number })?.payload);
    expect(fills).toContain(mint);

    const paths = collect(nodes, (n) => /Path$/.test(String(n.type)));
    const strokes = paths.map((n) => (n.props.stroke as { payload?: number })?.payload);
    expect(strokes).toContain(paper); // the tick on the mint ring

    const outlined = circles.filter((n) => n.props.stroke !== undefined);
    expect(outlined.length).toBeGreaterThan(0);
    expect(outlined.some((n) => (n.props.stroke as { payload?: number })?.payload === ink)).toBe(true);
  });

  it('draws all nine illustrated icons from the shared geometry', () => {
    for (const name of ILLUSTRATED_ICONS) {
      const rendered = drawCommands(render(<Icon name={name} weight="illustrated" size={76} />));
      expect(rendered.length).toBeGreaterThan(0);
      expect(rendered[0]).toBe(sourceFirstCommand(ILLUSTRATED[name]));
    }
  });

  it('renders the line set without throwing', () => {
    for (const name of ['bell', 'calendar', 'cart', 'search', 'close'] as const) {
      expect(() => render(<Icon name={name} size={24} />)).not.toThrow();
    }
  });
});

/** Every node in the tree matching a predicate. */
function collect(nodes: readonly Node[], pred: (n: Node) => boolean): Node[] {
  const out: Node[] = [];
  const walk = (node: Node | null) => {
    if (!node || typeof node === 'string') return;
    if (pred(node)) out.push(node);
    (node.children ?? []).forEach((c) => walk(c as Node));
  };
  nodes.forEach(walk);
  return out;
}

/** The first drawable leaf of a geometry, in the same encoding the tree walk uses. */
function sourceFirstCommand(prims: readonly unknown[]): string {
  const find = (list: readonly unknown[]): Record<string, unknown> | null => {
    for (const p of list as Array<Record<string, unknown>>) {
      if (p.el === 'g') {
        const hit = find(p.children as unknown[]);
        if (hit) return hit;
        continue;
      }
      return p;
    }
    return null;
  };
  const first = find(prims);
  if (!first) throw new Error('geometry has no drawable leaf');
  if (first.el === 'path') return `d:${String(first.d)}`;
  if (first.el === 'circle') return `circle:${first.cx},${first.cy},${first.r}`;
  return `rect:${first.x},${first.y},${first.w},${first.h},${first.rx}`;
}
