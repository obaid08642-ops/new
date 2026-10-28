import React from 'react';
import { readFileSync } from 'fs';
import { join } from 'path';
import { Text } from 'react-native';
import { act, render } from '@testing-library/react-native';
import { resolveDiagImage } from '../../utils/diagImage';
import { ItemPhoto } from './ItemPhoto';

jest.mock('expo-image', () => {
  const { View } = jest.requireActual('react-native');
  return { Image: (p: Record<string, unknown>) => <View {...p} /> };
});

const read = (p: string) => readFileSync(join(__dirname, '../../..', p), 'utf8');

describe('resolveDiagImage', () => {
  it('returns the own image first', () => {
    expect(resolveDiagImage('https://cdn.nabd.plus/labs/hiv.png', 56)).toContain('labs/hiv.png');
  });
  it('returns undefined (art fallback) when the item has no usable image', () => {
    for (const v of [undefined, null, '', '   ', 'http://cdn.nabd.plus/a.png']) expect(resolveDiagImage(v, 56)).toBeUndefined();
  });
});

describe('ItemPhoto', () => {
  const fb = <Text>art-fallback</Text>;
  it('draws the own image, the art when there is none', async () => {
    const a = await render(<ItemPhoto image="https://cdn.nabd.plus/labs/hiv.png" size={56} radius={16} bg="transparent" fallback={fb} />);
    expect(a.queryByTestId('item-photo')).toBeTruthy();
    expect(a.queryByText('art-fallback')).toBeNull();
    const b = await render(<ItemPhoto size={56} radius={16} bg="transparent" fallback={fb} />);
    expect(b.queryByText('art-fallback')).toBeTruthy();
  });
  it('falls back to the art when the image fails to load', async () => {
    const r = await render(<ItemPhoto image="https://cdn.nabd.plus/radiology/hsg.png" size={56} radius={16} bg="transparent" fallback={fb} />);
    await act(async () => { r.getByTestId('item-photo').props.onError(); });
    expect(r.queryByTestId('item-photo')).toBeNull();
    expect(r.queryByText('art-fallback')).toBeTruthy();
  });
});

describe('cards and detail pages use it', () => {
  it('ItemCard and DetailHead draw ItemPhoto with the art as fallback; the screens pass the item image', () => {
    const kit = read('src/components/diagnostics/DiagKit.tsx');
    expect(kit).toContain('<ItemPhoto image={image} size={56}');
    expect(kit).toContain('<ItemPhoto image={image} size={96}');
    expect(read('app/(tabs)/diagnostics.tsx')).toContain('image={test.image}');
    expect(read('app/(tabs)/diagnostics.tsx')).toContain('image={rad.image}');
    expect(read('app/diagnostics/test-detail.tsx')).toContain('image={data.image}');
    expect(read('app/diagnostics/package-detail.tsx')).toContain('image={pkg.image}');
  });
});
