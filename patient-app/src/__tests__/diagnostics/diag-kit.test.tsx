import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AmountLine, CartBar, LabCard, PackageCard, TestRow, Timeline, diagLook, diagStatus } from '../../components/diagnostics/DiagKit';
import { message } from '../../components/screen/ScreenKit';
import { normalizeLabService, normalizeProvider, rowsOf } from '../../utils/labMappers';

/**
 * Batch 3, slice 3-app: the shared labs and radiology pieces. Every value is a TEST value. What is proved: a test row draws
 * its name, tags and price and its add toggle fires and names its state; the package and lab cards draw what they are
 * given and press; the cart bar shows the count and total; the timeline names each step's state; the look and status
 * helpers map the server's words; the catalogue mapper invents nothing (a field the server did not send stays empty).
 */

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) },
}));
jest.mock('react-native-localize', () => ({ getLocales: () => [], findBestLanguageTag: () => undefined }));
jest.mock('../../context/AppContext', () => ({ useApp: () => ({ isDark: false, lang: 'en', isRTL: false }) }));

const k = (key: string, vars?: Record<string, string | number>) => message('en', key, vars);
const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, bottom: 34, left: 0, right: 0 } };
const wrap = (ui: React.ReactElement) => <SafeAreaProvider initialMetrics={metrics}>{ui}</SafeAreaProvider>;

describe('TestRow', () => {
  it('draws the name, tags and price and its toggle fires', async () => {
    const onToggle = jest.fn();
    await render(wrap(<TestRow name="Test one" tags={[{ label: 'Home sample', tone: 'mint' }]} note="Result within 24 h" price={90} toggle={{ on: false, label: 'Add Test one to the cart', onPress: onToggle }} />));
    expect(screen.getByText('Test one')).toBeTruthy();
    expect(screen.getByText('Home sample')).toBeTruthy();
    expect(screen.getByText('Result within 24 h')).toBeTruthy();
    expect(screen.getByText(/90\.00/)).toBeTruthy();
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Add Test one to the cart'));
    });
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('names the added state', async () => {
    await render(wrap(<TestRow name="Test two" price={null} toggle={{ on: true, label: 'Remove Test two from the cart', onPress: jest.fn() }} />));
    expect(screen.getByLabelText('Remove Test two from the cart').props.accessibilityState).toMatchObject({ selected: true });
  });
});

describe('cards', () => {
  it('PackageCard draws its facts and presses', async () => {
    const onPress = jest.fn();
    await render(wrap(<PackageCard name="Package one" desc="A line" count="Includes 3 tests" price={299} oldPrice={399} icon="drop" tone="coral" actionLabel="Details" onPress={onPress} />));
    expect(screen.getByText('Package one')).toBeTruthy();
    expect(screen.getByText('Includes 3 tests')).toBeTruthy();
    expect(screen.getByText('Details')).toBeTruthy();
    await act(async () => {
      fireEvent.press(screen.getByText('Package one'));
    });
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('LabCard shows the chosen state and presses', async () => {
    const onPress = jest.fn();
    await render(wrap(<LabCard name="Lab one" line="Rating 4.7" tags={[{ label: 'Home collection', tone: 'neutral' }]} selected onPress={onPress} />));
    expect(screen.getByLabelText(k('diag.selected'))).toBeTruthy();
    expect(screen.getByText('Home collection')).toBeTruthy();
    await act(async () => {
      fireEvent.press(screen.getByText('Lab one'));
    });
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

describe('CartBar and AmountLine', () => {
  it('shows the count and the total and fires its action', async () => {
    const onPress = jest.fn();
    await render(wrap(<CartBar count={2} total={340} bottom={0} actionLabel="Continue" countLabel="2 in the cart" totalLabel="Total" onPress={onPress} />));
    expect(screen.getByLabelText('2 in the cart')).toBeTruthy();
    expect(screen.getByText('340.00 SAR')).toBeTruthy();
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Continue'));
    });
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('draws a saving with its minus', async () => {
    await render(wrap(<AmountLine label="Covered" amount={180} success minus />));
    expect(screen.getByText('- 180.00 SAR')).toBeTruthy();
  });
});

describe('Timeline', () => {
  it('names the done and the current step', async () => {
    await render(
      wrap(
        <Timeline
          steps={[
            { key: 'a', title: 'Requested', state: 'done' },
            { key: 'b', title: 'On the way', time: '10:00', state: 'current' },
            { key: 'c', title: 'Result', state: 'todo' },
          ]}
        />,
      ),
    );
    expect(screen.getByLabelText(`Requested, ${k('diag.step.done')}`)).toBeTruthy();
    expect(screen.getByLabelText(`On the way, 10:00, ${k('diag.step.current')}`)).toBeTruthy();
    expect(screen.getByLabelText('Result')).toBeTruthy();
  });
});

describe('helpers', () => {
  it('maps a category to a glyph and tone, radiology always to the scan', () => {
    expect(diagLook('blood')).toEqual({ icon: 'drop', tone: 'coral' });
    expect(diagLook('anything')).toEqual({ icon: 'test-tube', tone: 'mint' });
    expect(diagLook('blood', 'radiology')).toEqual({ icon: 'scan', tone: 'violet' });
  });

  it('maps the booking states of both services onto the shared status labels and buckets', () => {
    expect(diagStatus('lab', 'REPORTED')).toMatchObject({ key: 'orders.status.resultReady', past: true });
    expect(diagStatus('lab', 'SAMPLE_COLLECTED')).toMatchObject({ key: 'orders.status.sampleCollected', past: false });
    expect(diagStatus('radiology', 'CANCELLED')).toMatchObject({ key: 'orders.status.cancelled', past: true });
    expect(diagStatus('lab', 'SOMETHING_NEW').key).toBe('orders.status.unknown');
  });

  it('the catalogue mapper keeps what the server sent and invents nothing', () => {
    const none = normalizeLabService({ id: 's1', name_ar: 'اسم', price: '90' });
    expect(none).toMatchObject({ id: 's1', name: 'اسم', price: 90, fastingRequired: false, fastingHours: null, turnaroundHours: null, testsList: [], preparation: [], oldPrice: null });
    const some = normalizeLabService({ id: 's2', name_ar: 'ب', price: 10, fasting_required: true, fasting_hours: 8, turnaround_hours: 24, included_services: ['x', { name_ar: 'y' }] });
    expect(some).toMatchObject({ fastingRequired: true, fastingHours: 8, turnaroundHours: 24, testsList: ['x', 'y'], testsCount: 2 });
    expect(normalizeLabService(null)).toBeNull();
  });

  it('reads a list from an array or an envelope, and a provider only with an id', () => {
    expect(rowsOf([1, 2])).toEqual([1, 2]);
    expect(rowsOf({ data: [3] })).toEqual([3]);
    expect(rowsOf({})).toEqual([]);
    expect(normalizeProvider({ name: 'no id' })).toBeNull();
    expect(normalizeProvider({ id: 'p', name: 'Lab', rating_avg: 4.5, home_visit_enabled: true })).toMatchObject({ id: 'p', rating: 4.5, homeVisit: true, distance: null });
  });
});
