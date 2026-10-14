import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Text } from 'react-native';

import { ApptCard, ConsultList, Gate, appointmentStatus, specialtyLook, visitMode } from '../../components/consult/ConsultKit';
import { DayStrip, ModeTiles, SlotGrid, slotsEmptyKey } from '../../components/consult/ConsultBooking';
import { message } from '../../components/screen/ScreenKit';

/**
 * Batch 2, slice 2-app: the shared consultation templates. Every value is a TEST value. What is proved: the list template
 * shows its loading, failure, offline and empty states and its rows; the gate maps each status to the right shared
 * state and retry works; the appointment card draws what it is given and its actions fire; the day, time and visit-type
 * controls select, and a taken time cannot be chosen.
 */

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) },
}));
jest.mock('react-native-localize', () => ({ getLocales: () => [], findBestLanguageTag: () => undefined }));
jest.mock('../../context/AppContext', () => ({ useApp: () => ({ isDark: false, lang: 'en', isRTL: false }) }));

const k = (key: string, vars?: Record<string, string | number>) => message('en', key, vars);
const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, bottom: 34, left: 0, right: 0 } };
const wrap = (ui: React.ReactElement) => <SafeAreaProvider initialMetrics={metrics}>{ui}</SafeAreaProvider>;

const empty = { icon: 'calendar-dots' as const, title: 'Nothing here', body: 'Body' };

describe('ConsultList', () => {
  it('shows a busy placeholder while loading and no rows', async () => {
    await render(wrap(<ConsultList title="T" data={[{ id: 'a' }]} status="loading" onRetry={jest.fn()} empty={empty} keyExtractor={(i) => i.id} renderItem={(i) => <Text>{i.id}</Text>} />));
    expect(screen.getByLabelText(k('consult.loading'))).toBeTruthy();
    expect(screen.queryByText('a')).toBeNull();
  });

  it('draws the rows when ready and the empty state when there are none', async () => {
    const { rerender } = await render(wrap(<ConsultList title="T" data={[{ id: 'row-1' }]} status="ready" onRetry={jest.fn()} empty={empty} keyExtractor={(i) => i.id} renderItem={(i) => <Text>{i.id}</Text>} />));
    expect(screen.getByText('row-1')).toBeTruthy();
    await rerender(wrap(<ConsultList title="T" data={[]} status="ready" onRetry={jest.fn()} empty={empty} keyExtractor={(i: { id: string }) => i.id} renderItem={(i) => <Text>{i.id}</Text>} />));
    expect(screen.getByText('Nothing here')).toBeTruthy();
  });

  it.each([['error', 'consult.error.title'], ['offline', 'consult.offline.title']] as const)('shows the %s state and retries', async (status, title) => {
    const onRetry = jest.fn();
    await render(wrap(<ConsultList title="T" data={[]} status={status} onRetry={onRetry} empty={empty} keyExtractor={(i: { id: string }) => i.id} renderItem={(i) => <Text>{i.id}</Text>} />));
    expect(screen.getByText(k(title))).toBeTruthy();
    await act(async () => {
      fireEvent.press(screen.getByText(k('consult.retry')));
    });
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});

describe('Gate', () => {
  it('renders its children only when ready', async () => {
    const { rerender } = await render(wrap(<Gate status="ready" onRetry={jest.fn()}><Text>content</Text></Gate>));
    expect(screen.getByText('content')).toBeTruthy();
    await rerender(wrap(<Gate status="missing" onRetry={jest.fn()}><Text>content</Text></Gate>));
    expect(screen.queryByText('content')).toBeNull();
    expect(screen.getByText(k('consult.missing.title'))).toBeTruthy();
  });
});

describe('ApptCard', () => {
  it('draws the title, the line, the mode and status and fires its actions', async () => {
    const onEdit = jest.fn();
    await render(wrap(<ApptCard day={{ day: '12', month: 'Oct' }} title="Dr. Test" subtitle="Cardiology · 10:00" mode="online" status={{ label: 'Confirmed', tone: 'info' }} actions={[{ label: 'Change or cancel', onPress: onEdit, tone: 'outline' }]} />));
    expect(screen.getByText('Dr. Test')).toBeTruthy();
    expect(screen.getByText('Cardiology · 10:00')).toBeTruthy();
    expect(screen.getByText(k('consult.mode.online'))).toBeTruthy();
    expect(screen.getByText('12')).toBeTruthy();
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Change or cancel'));
    });
    expect(onEdit).toHaveBeenCalledTimes(1);
  });
});

describe('booking controls', () => {
  it('SlotGrid selects a free time and never a taken one', async () => {
    const onChange = jest.fn();
    await render(wrap(<SlotGrid loading={false} value={null} onChange={onChange} emptyText="none" slots={[{ id: 's1', label: '09:00', available: true }, { id: 's2', label: '09:30', available: false }]} />));
    await act(async () => {
      fireEvent.press(screen.getByLabelText('09:00'));
    });
    expect(onChange).toHaveBeenCalledWith('s1');
    expect(screen.getByLabelText('09:30').props.accessibilityState).toMatchObject({ disabled: true });
  });

  it('SlotGrid says why a day is empty', async () => {
    await render(wrap(<SlotGrid loading={false} value={null} onChange={jest.fn()} emptyText={k(slotsEmptyKey('closed'))} slots={[]} />));
    expect(screen.getByText(k('consult.slots.closed'))).toBeTruthy();
  });

  it('DayStrip and ModeTiles report the chosen index and id, and show the fee of each mode', async () => {
    const onDay = jest.fn();
    const onMode = jest.fn();
    await render(
      wrap(
        <>
          <DayStrip label="Day" value={0} onChange={onDay} days={[{ iso: '2026-10-07', name: 'Today', day: '7', month: 'Oct' }, { iso: '2026-10-08', name: 'Tomorrow', day: '8', month: 'Oct' }]} />
          <ModeTiles label="Type" value="clinic" onChange={onMode} tiles={[{ id: 'clinic', mode: 'clinic', price: 150 }, { id: 'video', mode: 'online', price: null }]} />
        </>,
      ),
    );
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Tomorrow 8 Oct'));
      fireEvent.press(screen.getByLabelText(k('consult.mode.online')));
    });
    expect(onDay).toHaveBeenCalledWith(1);
    expect(onMode).toHaveBeenCalledWith('video');
    expect(screen.getByText(/150\.00/)).toBeTruthy();
  });
});

describe('helpers', () => {
  it('maps the server words to the three modes, the status labels and a specialty glyph', async () => {
    expect(visitMode('video')).toBe('online');
    expect(visitMode('home_visit')).toBe('home');
    expect(visitMode('in_person')).toBe('clinic');
    expect(visitMode('unknown')).toBeNull();
    expect(appointmentStatus('COMPLETED').key).toBe('consult.status.completed');
    expect(appointmentStatus('CHECKED_IN').key).toBe('consult.status.inProgress');
    expect(appointmentStatus('whatever').key).toBe('consult.status.other');
    expect(specialtyLook('Dentistry').icon).toBe('tooth');
    expect(specialtyLook('عيون').icon).toBe('eye');
    expect(specialtyLook('Something new').icon).toBe('stethoscope');
  });
});
