import React from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';

import { FadeIn, NATIVE_MOTION, setReduceMotionForTest, staggerDelay } from '../../../packages/ui-native/src';

/** A list rises in one item after the other, a token step apart (motion.stagger.min), at most five steps, and not at all with reduced motion. */

describe('list stagger', () => {
  afterEach(() => setReduceMotionForTest(false));

  it('the step is the token (40 ms) and each place waits one step more, up to five', () => {
    expect(NATIVE_MOTION.stagger).toBe(40);
    expect([0, 1, 2, 5, 6, 40].map(staggerDelay)).toEqual([0, 40, 80, 200, 200, 200]);
  });

  it('a negative, fractional or missing index is a plain place', () => {
    expect(staggerDelay(-3)).toBe(0);
    expect(staggerDelay(Number.NaN)).toBe(0);
    expect(staggerDelay(1.9)).toBe(40);
  });

  it('draws its children with an index, and with reduced motion too', async () => {
    for (const reduced of [false, true]) {
      setReduceMotionForTest(reduced);
      const view = await render(<FadeIn index={3}><Text>row</Text></FadeIn>);
      expect(view.getByText('row')).toBeTruthy();
      view.unmount();
    }
  });
});
