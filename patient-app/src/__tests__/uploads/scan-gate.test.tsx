import React from 'react';
import { AppState } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ScanStatusBadge } from '../../components/ScanStatusBadge';
import { useScanGate } from '../../hooks/useScanGate';
import { message } from '../../components/screen/ScreenKit';
import type { ScanProbeResult } from '../../utils/scanStatus';

/**
 * UPLOAD_SCAN=defer, app side. TEST values. Proved: a file that answers 423 shows "being checked" with no error and is asked
 * again after retry_after_seconds and when the app is foregrounded again; a 200 turns it into the ready state; an infected answer
 * shows the rejection with the re-upload action; nothing is asked after unmount.
 */
jest.mock('react-native-localize', () => ({ getLocales: () => [], findBestLanguageTag: () => undefined }));
jest.mock('../../context/AppContext', () => ({ useApp: () => ({ isDark: false, lang: 'en', isRTL: false }) }));

const k = (key: string) => message('en', key);
const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, bottom: 34, left: 0, right: 0 } };

let probeMock: jest.Mock = jest.fn();
function Probe({ results, onReupload }: { results: ScanProbeResult[]; onReupload?: () => void }) {
  const probe = React.useRef(jest.fn(async () => results.shift() ?? { status: 423 })).current;
  probeMock = probe;
  const state = useScanGate(probe, 'pending');
  return <SafeAreaProvider initialMetrics={metrics}><ScanStatusBadge state={state} onReupload={onReupload} /></SafeAreaProvider>;
}
const calls = () => probeMock.mock.calls.length;

beforeEach(() => jest.useFakeTimers());
afterEach(() => { jest.useRealTimers(); jest.restoreAllMocks(); });

describe('useScanGate + ScanStatusBadge', () => {
  it('423 shows the checking state, retries after 60 s, then shows nothing once the file is ok', async () => {
    await render(<Probe results={[{ status: 423, body: { retry_after_seconds: 60 } }, { status: 200 }]} />);
    await act(async () => { await jest.advanceTimersByTimeAsync(0); });
    expect(screen.getByText(k('scanStatus.checking'))).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(calls()).toBe(1);
    await act(async () => { await jest.advanceTimersByTimeAsync(59_000); });
    expect(calls()).toBe(1);
    await act(async () => { await jest.advanceTimersByTimeAsync(1_000); });
    expect(calls()).toBe(2);
    expect(screen.queryByText(k('scanStatus.checking'))).toBeNull();
  });

  it('retries when the app comes back to the foreground', async () => {
    let listener: ((s: string) => void) | undefined;
    jest.spyOn(AppState, 'addEventListener').mockImplementation(((_: string, fn: (s: string) => void) => { listener = fn; return { remove: jest.fn() }; }) as never);
    await render(<Probe results={[{ status: 423 }, { status: 200 }]} />);
    await act(async () => { await jest.advanceTimersByTimeAsync(0); });
    await act(async () => { await jest.advanceTimersByTimeAsync(6_000); });
    await act(async () => { listener?.('active'); await jest.advanceTimersByTimeAsync(0); });
    expect(calls()).toBe(2);
  });

  it('infected shows the rejection and the re-upload action', async () => {
    const onReupload = jest.fn();
    await render(<Probe results={[{ status: 423 }, { status: 200, body: { scan_status: 'infected' } }]} onReupload={onReupload} />);
    await act(async () => { await jest.advanceTimersByTimeAsync(0); });
    await act(async () => { await jest.advanceTimersByTimeAsync(60_000); });
    expect(screen.getByText(k('scanStatus.rejected'))).toBeTruthy();
    await act(async () => { fireEvent.press(screen.getByLabelText(k('scanStatus.uploadAnother'))); });
    expect(onReupload).toHaveBeenCalledTimes(1);
  });

  it('stops asking after unmount', async () => {
    const view = await render(<Probe results={[{ status: 423 }, { status: 200 }]} />);
    await act(async () => { await jest.advanceTimersByTimeAsync(0); });
    view.unmount();
    await act(async () => { await jest.advanceTimersByTimeAsync(180_000); });
    expect(calls()).toBe(1);
  });
});
