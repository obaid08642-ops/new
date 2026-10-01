import * as TestRenderer from 'react-test-renderer';
import type { ReactTestRendererJSON } from 'react-test-renderer';

import {
  Icon as NabdIcon,
  Illustration as NabdIllustration,
  ILLUSTRATION_NAMES,
  ILLUSTRATED_ICONS,
} from '@nabd/ui-native';
import { tokens } from '../../../../packages/design-tokens/dist/ts/tokens';

/**
 * 12.A6 — the app's PUBLIC design-system API really exposes the brand artwork.
 *
 * The wrapper's own tests prove the component works. This one proves APP CODE can
 * reach it: `@nabd/ui-native` -> `packages/ui-native/src/Icon.tsx` ->
 * `packages/ui/icons/*` is a two-hop module path with a tsconfig alias and a
 * source-only package in the middle, and every one of those hops is a way for the
 * import to resolve to nothing at bundle time while tsc stays green.
 *
 * The import is the app-facing alias rather than `@/design-system`, because that
 * barrel also pulls in the legacy `Icon` and with it AppContext and
 * react-native-localize — a native module that has no jest mock, so a test of the
 * artwork would fail on an unrelated module boundary.
 */

function render(el: React.ReactElement): ReactTestRendererJSON[] {
  let tree!: TestRenderer.ReactTestRenderer;
  TestRenderer.act(() => {
    tree = TestRenderer.create(el);
  });
  const json = tree.toJSON();
  if (json === null) return [];
  return Array.isArray(json) ? json : [json];
}

describe('patient-app reaches the 12.A6 brand artwork by alias', () => {
  it('re-exports the wrappers rather than undefined', () => {
    expect(typeof NabdIcon).toBe('function');
    expect(typeof NabdIllustration).toBe('function');
  });

  it('renders a service tile through the barrel', () => {
    const [svg] = render(<NabdIcon name="pharmacy" weight="illustrated" size={76} />);
    expect(svg).toBeTruthy();
    // The 48 grid is the illustrated-ICON grid; a 64 here would mean the scene
    // component answered instead of the icon one.
    expect(svg!.props.vbWidth).toBe(48);
  });

  it('renders an empty state through the barrel, in the token palette', () => {
    const [svg] = render(<NabdIllustration name="emptyOrders" size={128} />);
    expect(svg!.props.vbWidth).toBe(64);
    // React Native has no custom properties, so a var() in the tree would render
    // as black. The colour has to arrive as a resolved value from the token module.
    expect(JSON.stringify(svg)).not.toContain('var(--');
    expect(tokens('light').color.iconArt.mint).toBeTruthy();
  });

  it('publishes the full sets so a screen can enumerate them', () => {
    expect(ILLUSTRATED_ICONS).toHaveLength(9);
    expect(ILLUSTRATION_NAMES.length).toBe(17);
  });
});
