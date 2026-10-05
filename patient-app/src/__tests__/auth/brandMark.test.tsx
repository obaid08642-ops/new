import React from 'react';
import { render, screen } from '@testing-library/react-native';

import { BrandMark } from '../../../../packages/ui-native/src';
import {
  BRAND_GOOGLE_PATH,
  BRAND_SNAPCHAT_PATH,
  BRAND_X_PATH,
} from '../../../../packages/ui/icons/marks';

// The decorative mark is hidden from the accessibility tree on purpose; the test still has to find it.
const ANY = { includeHiddenElements: true };

type Node = { type: string; props: Record<string, unknown>; children?: Node[] | null };
const findAll = (tree: unknown, type: string): Node[] => {
  const nodes = Array.isArray(tree) ? tree : [tree];
  return nodes.flatMap((n) => (n && typeof n === 'object' ? [...((n as Node).type === type ? [n as Node] : []), ...findAll((n as Node).children ?? [], type)] : []));
};

describe('<BrandMark> (the sign-in brand marks of packages/ui-native)', () => {
  it.each([
    ['google', BRAND_GOOGLE_PATH],
    ['x', BRAND_X_PATH],
    ['snapchat', BRAND_SNAPCHAT_PATH],
  ] as const)('draws %s from the shared path data in the one colour it is given', async (brand, path) => {
    await render(<BrandMark brand={brand} color="#0B1B2B" testID="mark" />);
    expect(screen.getByTestId('mark', ANY)).toBeTruthy();
    const paths = findAll(screen.toJSON(), 'RNSVGPath');
    expect(paths).toHaveLength(1);
    expect(paths[0].props.d).toBe(path);
    expect(paths[0].props.fill).toEqual(expect.anything()); // react-native-svg resolves the colour into its native form
  });

  it('is decorative unless it is given a label', async () => {
    await render(<BrandMark brand="google" color="#000" testID="deco" />);
    expect(screen.getByTestId('deco', ANY).props.accessible).toBe(false);
    await render(<BrandMark brand="google" color="#000" label="Google" testID="named" />);
    expect(screen.getByTestId('named', ANY).props.accessibilityLabel).toBe('Google');
  });

  it('keeps the glyph proportions: the height is the size, the width follows the viewBox', async () => {
    await render(<BrandMark brand="google" color="#000" size={20} testID="g" />);
    expect(screen.getByTestId('g', ANY).props.height).toBe(20);
    expect(screen.getByTestId('g', ANY).props.width).toBe(Math.round((20 * 488) / 512));
  });
});
