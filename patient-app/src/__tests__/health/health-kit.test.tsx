import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Text } from 'react-native';

import { HealthTabs, LineChart, MetricTile, Notice, Row, SheetForm, bodyOf, rowsOf, useRemote, useTab, vitalLook } from '../../components/health/HealthKit';
import { RedirectKeepingParams } from '../../components/health/RedirectKeepingParams';
import { message } from '../../components/screen/ScreenKit';
import { translations } from '../../i18n';

/**
 * Batch 5: the shared health pieces. Every value is a TEST value. What is proved: the link tabs mark the selected tab and
 * report a change; the sheet form shows its title, the error of the last save and fires its save; a row and a metric tile
 * draw what they are given and press; the line chart is named and draws nothing for an empty series; the tab of the route is
 * limited to the tabs the screen has; an old route redirect keeps the query it was opened with; the loader reports ready and failed loads; and the medication words of the old table now live in the six locale files.
 */

const mockParams: { current: Record<string, string> } = { current: {} };
const mockSetParams = jest.fn();
const mockRedirect = jest.fn((props: { href: unknown }) => null);

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true), setParams: (...args: unknown[]) => mockSetParams(...args) },
  useLocalSearchParams: () => mockParams.current,
  Redirect: (props: { href: unknown }) => mockRedirect(props),
}));
jest.mock('react-native-localize', () => ({ getLocales: () => [], findBestLanguageTag: () => undefined }));
jest.mock('../../context/AppContext', () => ({ useApp: () => ({ isDark: false, lang: 'en', isRTL: false }) }));
jest.mock('../../utils/logger', () => ({ logError: jest.fn() }));
jest.mock('../../utils/isOffline', () => ({ isOffline: jest.fn(async () => false) }));

const k = (key: string, vars?: Record<string, string | number>) => message('en', key, vars);
const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, bottom: 34, left: 0, right: 0 } };
const wrap = (ui: React.ReactElement) => <SafeAreaProvider initialMetrics={metrics}>{ui}</SafeAreaProvider>;

beforeEach(() => {
  mockParams.current = {};
  mockSetParams.mockClear();
  mockRedirect.mockClear();
});

describe('HealthTabs', () => {
  it('marks the selected tab and reports the one pressed', async () => {
    const onChange = jest.fn();
    await render(wrap(<HealthTabs tabs={[{ key: 'a', label: 'Alpha' }, { key: 'b', label: 'Beta' }]} value="a" onChange={onChange} />));
    expect(screen.getByLabelText('Alpha').props.accessibilityState.selected).toBe(true);
    expect(screen.getByLabelText('Beta').props.accessibilityState.selected).toBe(false);
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Beta'));
    });
    expect(onChange).toHaveBeenCalledWith('b');
  });
});

describe('useTab', () => {
  const Probe = () => {
    const [tab, setTab] = useTab(['today', 'history'] as const, 'today');
    return <Text onPress={() => setTab('history')}>{tab}</Text>;
  };
  it('falls back to the first tab for a tab the screen does not have', async () => {
    mockParams.current = { tab: 'nonsense' };
    await render(<Probe />);
    expect(screen.getByText('today')).toBeTruthy();
  });
  it('reads a known tab from the route and sets the route query on change', async () => {
    mockParams.current = { tab: 'history' };
    await render(<Probe />);
    expect(screen.getByText('history')).toBeTruthy();
    await act(async () => {
      fireEvent.press(screen.getByText('history'));
    });
    expect(mockSetParams).toHaveBeenCalledWith({ tab: 'history' });
  });
});

describe('SheetForm', () => {
  it('shows the title and the error, and saves', async () => {
    const onSave = jest.fn();
    await render(wrap(<SheetForm open title="Add reading" onClose={jest.fn()} onSave={onSave} error="Could not save" saveLabel="Save reading"><Text>field</Text></SheetForm>));
    expect(screen.getByText('Add reading')).toBeTruthy();
    expect(screen.getByText('field')).toBeTruthy();
    expect(screen.getByText('Could not save')).toBeTruthy();
    await act(async () => {
      fireEvent.press(screen.getByText('Save reading'));
    });
    expect(onSave).toHaveBeenCalledTimes(1);
  });
  it('draws nothing when it is closed', async () => {
    await render(wrap(<SheetForm open={false} title="Add reading" onClose={jest.fn()} onSave={jest.fn()} saveLabel="Save"><Text>field</Text></SheetForm>));
    expect(screen.queryByText('field')).toBeNull();
  });
});

describe('Row, MetricTile, Notice', () => {
  it('draws a row with its lines and presses', async () => {
    const onPress = jest.fn();
    await render(wrap(<Row icon="pill" tone="coral" title="Panadol · 500 mg" subtitle="08:00" onPress={onPress} />));
    expect(screen.getByText('08:00')).toBeTruthy();
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Panadol · 500 mg, 08:00'));
    });
    expect(onPress).toHaveBeenCalledTimes(1);
  });
  it('draws a metric with its unit and its time', async () => {
    await render(wrap(<MetricTile label="Weight" value="72" unit="kg" caption="Last measured today" icon="scales" tone="teal" />));
    expect(screen.getByText('Weight')).toBeTruthy();
    expect(screen.getByText('Last measured today')).toBeTruthy();
  });
  it('gives an error notice the alert role', async () => {
    await render(<Notice tone="danger" text="Failed" testID="n" />);
    expect(screen.getByTestId('n').props.accessibilityRole).toBe('alert');
  });
});

describe('LineChart', () => {
  it('is an image named by its label', async () => {
    await render(wrap(<LineChart values={[1, 2, 3]} tone="mint" label="Glucose trend" testID="chart" />));
    expect(screen.getByLabelText('Glucose trend')).toBeTruthy();
  });
  it('draws nothing for an empty series', async () => {
    await render(wrap(<LineChart values={[]} tone="mint" label="Glucose trend" testID="chart" />));
    expect(screen.queryByTestId('chart')).toBeNull();
  });
});

describe('RedirectKeepingParams', () => {
  it('keeps the query of the old route and adds the tab', async () => {
    mockParams.current = { type: 'bp', other: 'x' };
    await render(<RedirectKeepingParams to="/health/vitals" params={{ tab: 'history' }} />);
    expect(mockRedirect.mock.calls[0][0].href).toEqual({ pathname: '/health/vitals', params: { type: 'bp', other: 'x', tab: 'history' } });
  });
});

describe('useRemote', () => {
  const Probe = ({ load }: { load: () => Promise<string> }) => {
    const { status, data } = useRemote(load, [], 'test');
    return <Text>{`${status}:${data ?? ''}`}</Text>;
  };
  it('loads the data and says it is ready', async () => {
    await render(<Probe load={async () => 'ok'} />);
    expect(await screen.findByText('ready:ok')).toBeTruthy();
  });
  it('is in the error state when the first load fails', async () => {
    await render(<Probe load={async () => { throw new Error('x'); }} />);
    expect(await screen.findByText('error:')).toBeTruthy();
  });
});

describe('helpers', () => {
  it('reads a list and an object from the bare or the enveloped answer', () => {
    expect(rowsOf([1, 2])).toEqual([1, 2]);
    expect(rowsOf({ data: [3] })).toEqual([3]);
    expect(rowsOf(null)).toEqual([]);
    expect(bodyOf({ data: { a: 1 } })).toEqual({ a: 1 });
    expect(bodyOf({ a: 2 })).toEqual({ a: 2 });
  });
  it('gives each vital of the API a glyph and a tone, and a default for an unknown one', () => {
    for (const key of ['bp', 'glucose', 'heart_rate', 'weight', 'temperature', 'spo2']) expect(vitalLook(key).label).toBe(`health.vital.${key}`);
    expect(vitalLook('unknown').label).toBe('');
  });
});

describe('the medication words (moved from src/i18n/medications.ts into the locale files)', () => {
  const bag = translations as unknown as Record<string, Record<string, string>>;
  const languages = ['ar', 'en', 'ur', 'hi', 'bn', 'fil'] as const;

  it('has every health.med.* word of the Arabic file in all six languages, none empty', () => {
    const keys = Object.keys(bag.ar).filter((key) => key.startsWith('health.med.'));
    expect(keys.length).toBeGreaterThan(100);
    for (const language of languages) {
      for (const key of keys) expect((bag[language][key] ?? '').trim()).not.toBe('');
    }
  });
  it('interpolates the counters without leaving template tokens', () => {
    const result = message('en', 'health.med.doseProgress', { taken: 2, scheduled: 3 });
    expect(result).toContain('2');
    expect(result).toContain('3');
    expect(result).not.toContain('{taken}');
    expect(k('health.vitals.title')).toBe('My vitals');
  });
});
