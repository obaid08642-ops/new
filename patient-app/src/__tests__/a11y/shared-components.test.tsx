import React from 'react';
import { StyleSheet } from 'react-native';
import { render, screen } from '@testing-library/react-native';

import { Button, IconButton, Input, Radio, Search, Segmented, Stepper, StatusChip, Toggle } from '../../../../packages/ui-native/src';

/**
 * PT-40 (patient app): the shared components every screen is built from. Measured, not read: every interactive element has an
 * accessibility role and a non-empty label, reaches 44pt (its own height plus its hit slop), carries its state in
 * accessibilityState (not in colour alone), and a status chip carries its meaning as text. Both themes. Labels are TEST text.
 */

type El = ReturnType<typeof screen.getByTestId>;
const slopOf = (hitSlop: unknown) => {
  if (typeof hitSlop === 'number') return { v: hitSlop * 2, h: hitSlop * 2 };
  const s = (hitSlop ?? {}) as { top?: number; bottom?: number; left?: number; right?: number };
  return { v: (s.top ?? 0) + (s.bottom ?? 0), h: (s.left ?? 0) + (s.right ?? 0) };
};
/** The tappable height: the larger of height and minHeight, plus the vertical hit slop. */
const reach = (el: El) => {
  const style = (StyleSheet.flatten(el.props.style) ?? {}) as { height?: number; minHeight?: number };
  return Math.max(style.height ?? 0, style.minHeight ?? 0) + slopOf(el.props.hitSlop).v;
};
const reachW = (el: El) => {
  const style = (StyleSheet.flatten(el.props.style) ?? {}) as { width?: number; minWidth?: number };
  return Math.max(style.width ?? 0, style.minWidth ?? 0) + slopOf(el.props.hitSlop).h;
};
const named = (el: El) => typeof el.props.accessibilityLabel === 'string' && el.props.accessibilityLabel.trim().length > 0;

const noop = () => undefined;
const themes = ['light', 'dark'] as const;

describe.each(themes)('shared components, %s theme', (theme) => {
  it('Button: role button, label, 44pt at every size, busy/disabled in state', async () => {
    await render(
      <>
        {(['sm', 'md', 'lg'] as const).map((size) => (
          <Button key={size} label={`Test ${size}`} size={size} onPress={noop} theme={theme} testID={`b-${size}`} />
        ))}
        <Button label="Test busy" loading onPress={noop} theme={theme} testID="b-busy" />
      </>,
    );
    for (const id of ['b-sm', 'b-md', 'b-lg', 'b-busy']) {
      const el = screen.getByTestId(id);
      expect(el.props.accessibilityRole).toBe('button');
      expect(named(el)).toBe(true);
      expect(reach(el)).toBeGreaterThanOrEqual(44);
    }
    expect(screen.getByTestId('b-busy').props.accessibilityState).toMatchObject({ busy: true, disabled: true });
  });

  it('IconButton: role button, a required label, 44 by 44', async () => {
    await render(<IconButton name="caret-left" label="Test close" onPress={noop} theme={theme} testID="ib" />);
    const el = screen.getByTestId('ib');
    expect(el.props.accessibilityRole).toBe('button');
    expect(named(el)).toBe(true);
    expect(reach(el)).toBeGreaterThanOrEqual(44);
    expect(reachW(el)).toBeGreaterThanOrEqual(44);
  });

  it('Segmented: a labelled radio group, one radio per option, the chosen one checked, 44pt, in option order', async () => {
    await render(
      <Segmented
        label="Test ways"
        value="b"
        onChange={noop}
        size="sm"
        options={[{ value: 'a', label: 'Test A' }, { value: 'b', label: 'Test B' }, { value: 'c', label: 'Test C' }]}
        theme={theme}
        testID="seg"
      />,
    );
    expect(screen.getByTestId('seg').props.accessibilityRole).toBe('radiogroup');
    expect(named(screen.getByTestId('seg'))).toBe(true);
    const radios = screen.getAllByRole('radio');
    expect(radios.map((r) => r.props.accessibilityLabel)).toEqual(['Test A', 'Test B', 'Test C']);
    expect(radios.map((r) => r.props.accessibilityState.checked)).toEqual([false, true, false]);
    for (const r of radios) expect(reach(r)).toBeGreaterThanOrEqual(44);
  });

  it('Toggle: role switch, label, checked state, 44pt', async () => {
    await render(<Toggle label="Test reminders" value onChange={noop} theme={theme} testID="tg" />);
    const el = screen.getByTestId('tg');
    expect(el.props.accessibilityRole).toBe('switch');
    expect(named(el)).toBe(true);
    expect(el.props.accessibilityState.checked).toBe(true);
    expect(reach(el)).toBeGreaterThanOrEqual(44);
  });

  it('Radio row: role radio, label with its meta, checked state, 44pt', async () => {
    await render(<Radio label="Test card" meta="Test meta" selected onChange={noop} theme={theme} testID="rd" />);
    const el = screen.getByTestId('rd');
    expect(el.props.accessibilityRole).toBe('radio');
    expect(el.props.accessibilityLabel).toBe('Test card, Test meta');
    expect(el.props.accessibilityState.checked).toBe(true);
    expect(reach(el)).toBeGreaterThanOrEqual(44);
  });

  it('Input: the field is named by its label, an error is announced as an alert and shown as text', async () => {
    await render(<Input label="Test name" value="" onChange={noop} error="Test error" invalid theme={theme} testID="in" />);
    const field = screen.getByLabelText('Test name');
    expect(field).toBeTruthy();
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByText('Test error')).toBeTruthy();
  });

  it('Search: the field has a label, the clear and scan buttons are named buttons that reach 44pt', async () => {
    await render(<Search label="Test search" value="x" onChange={noop} onClear={noop} clearLabel="Test clear" onScanPress={noop} scanLabel="Test scan" onFilterPress={noop} filterLabel="Test filter" theme={theme} />);
    expect(screen.getByLabelText('Test search')).toBeTruthy();
    for (const label of ['Test clear', 'Test scan', 'Test filter']) {
      const el = screen.getByLabelText(label);
      expect(el.props.accessibilityRole).toBe('button');
      expect(reach(el)).toBeGreaterThanOrEqual(44);
      expect(reachW(el)).toBeGreaterThanOrEqual(44);
    }
  });

  it('Stepper: both buttons are named and reach 44pt', async () => {
    await render(<Stepper label="Test quantity" value={2} onChange={noop} decrementLabel="Test less" incrementLabel="Test more" theme={theme} />);
    for (const label of ['Test less', 'Test more']) {
      const el = screen.getByLabelText(label);
      expect(el.props.accessibilityRole).toBe('button');
      expect(reach(el)).toBeGreaterThanOrEqual(44);
      expect(reachW(el)).toBeGreaterThanOrEqual(44);
    }
  });

  it('StatusChip: the meaning is text, not only colour', async () => {
    await render(
      <>
        {(['mint', 'coral'] as const).map((tone) => (
          <StatusChip key={tone} label={`Test ${tone}`} tone={tone} theme={theme} />
        ))}
      </>,
    );
    for (const tone of ['mint', 'coral']) expect(screen.getByText(`Test ${tone}`)).toBeTruthy();
  });
});
