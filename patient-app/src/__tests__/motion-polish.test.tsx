import React from 'react';
import { Text } from 'react-native';
import { act, render } from '@testing-library/react-native';

import { EmptyState, Skeleton, countUpValue, setReduceMotionForTest, useCountUp, NATIVE_MOTION } from '../../../packages/ui-native/src';

/** The shared native motion: a skeleton breathes, a state fades in, a check pops, a number counts; all still with reduced motion. */

function Counter({ value }: { value: number }) {
  return <Text testID="count">{useCountUp(value)}</Text>;
}

describe('native motion polish', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    setReduceMotionForTest(false);
  });
  afterEach(() => jest.useRealTimers());

  it('every skeleton variant is drawn (hidden from the accessibility tree) and keeps its size', async () => {
    const view = await render(<><Skeleton variant="tile" testID="s-tile" /><Skeleton variant="circle" testID="s-circle" /><Skeleton variant="text" lines={2} testID="s-text" /></>);
    for (const id of ['s-tile', 's-circle', 's-text']) {
      // hidden from the accessibility tree on purpose, so the query has to ask for hidden elements
      expect(view.getByTestId(id, { includeHiddenElements: true }).props.accessibilityElementsHidden).toBe(true);
    }
  });

  it('an empty state draws its title and action, with the pop only when asked', async () => {
    const view = await render(<EmptyState icon="check-circle" tone="mint" title="Paid" actionLabel="Track" popIcon />);
    expect(view.getByText('Paid')).toBeTruthy();
    expect(view.getByText('Track')).toBeTruthy();
    const plain = await render(<EmptyState icon="warning" tone="amber" title="Nothing here" />);
    expect(plain.getByText('Nothing here')).toBeTruthy();
  });

  it('a number counts to its new value and ends exactly on it; with reduced motion it jumps', async () => {
    const view = await render(<Counter value={2} />);
    expect(view.getByTestId('count').props.children).toBe(2);
    await act(async () => { view.rerender(<Counter value={9} />); });
    await act(async () => { jest.advanceTimersByTime(NATIVE_MOTION.enterMax + 50); });
    expect(view.getByTestId('count').props.children).toBe(9);
    setReduceMotionForTest(true);
    await act(async () => { view.rerender(<Counter value={4} />); });
    expect(view.getByTestId('count').props.children).toBe(4);
  });

  it('the easing starts at the old value and ends on the new one', () => {
    expect(countUpValue(2, 10, 0)).toBe(2);
    expect(countUpValue(2, 10, 1)).toBe(10);
    expect(countUpValue(10, 3, 2)).toBe(3);
  });

  it('the motion numbers are the tokens', () => {
    expect(NATIVE_MOTION.pressScale).toBe(0.97);
    expect(NATIVE_MOTION.enter).toBe(200);
    expect(NATIVE_MOTION.enterMax).toBe(240);
    expect(NATIVE_MOTION.skeleton).toBe(1400);
  });
});
