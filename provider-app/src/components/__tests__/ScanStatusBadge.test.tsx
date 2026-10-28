import React from 'react';
import { AppState } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { ScanStatusBadge, scanText } from '../ScanStatusBadge';
import { useScanGate } from '../../hooks/useScanGate';
import { noteUploadScan, scanOfStored, scanStateOfRequestError, clearStoredScan } from '../../utils/scanRegistry';
import type { ScanProbeResult } from '../../utils/scanStatus';

/** UPLOAD_SCAN=defer, provider side. TEST values: 423 shows "being checked" and is asked again, 200 clears it, infected shows the rejection. */
jest.mock('../../context', () => {
  const theme = new Proxy({}, { get: () => 'transparent' });
  return { useTheme: () => ({ theme, isDark: false }), useLang: () => ({ lang: 'en', isRTL: false }), useToast: () => ({ show: jest.fn() }) };
});

let probeMock: jest.Mock = jest.fn();
function Probe({ results, onReupload }: { results: ScanProbeResult[]; onReupload?: () => void }) {
  const probe = React.useRef(jest.fn(async () => results.shift() ?? { status: 423 })).current;
  probeMock = probe;
  const state = useScanGate(probe, 'pending');
  return <ScanStatusBadge state={state} onReupload={onReupload} />;
}

beforeEach(() => jest.useFakeTimers());
afterEach(() => { jest.useRealTimers(); jest.restoreAllMocks(); });

describe('ScanStatusBadge with the scan gate', () => {
  it('423 shows the checking state without an error, asks again after 60 s, and clears on 200', async () => {
    await render(<Probe results={[{ status: 423, body: { retry_after_seconds: 60 } }, { status: 200 }]} />);
    await act(async () => { await jest.advanceTimersByTimeAsync(0); });
    expect(screen.getByText(scanText('en', 'scanChecking'))).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
    await act(async () => { await jest.advanceTimersByTimeAsync(60_000); });
    expect(probeMock).toHaveBeenCalledTimes(2);
    expect(screen.queryByText(scanText('en', 'scanChecking'))).toBeNull();
  });

  it('infected shows the rejection with the re-upload action', async () => {
    const onReupload = jest.fn();
    await render(<Probe results={[{ status: 423 }, { status: 200, body: { scan_status: 'infected' } }]} onReupload={onReupload} />);
    await act(async () => { await jest.advanceTimersByTimeAsync(0); });
    await act(async () => { await jest.advanceTimersByTimeAsync(60_000); });
    expect(screen.getByText(scanText('en', 'scanRejected'))).toBeTruthy();
    await act(async () => { fireEvent.press(screen.getByTestId('scan-status-reupload')); });
    expect(onReupload).toHaveBeenCalledTimes(1);
  });

  it('asks again when the app returns to the foreground, and stops after unmount', async () => {
    let listener: ((s: string) => void) | undefined;
    jest.spyOn(AppState, 'addEventListener').mockImplementation(((_: string, fn: (s: string) => void) => { listener = fn; return { remove: jest.fn() }; }) as never);
    const view = await render(<Probe results={[{ status: 423 }, { status: 423 }]} />);
    await act(async () => { await jest.advanceTimersByTimeAsync(6_000); });
    await act(async () => { listener?.('active'); await jest.advanceTimersByTimeAsync(0); });
    expect(probeMock).toHaveBeenCalledTimes(2);
    view.unmount();
    await act(async () => { await jest.advanceTimersByTimeAsync(180_000); });
    expect(probeMock).toHaveBeenCalledTimes(2);
  });
});

describe('scan registry', () => {
  it('remembers a pending upload by id, forgets it when cleared, and reads 400 file_infected / 423 off a failed request', () => {
    expect(noteUploadScan('f1', { id: 'f1', scan_status: 'pending_scan' })).toBe('pending');
    expect(scanOfStored('f1')).toBe('pending');
    clearStoredScan('f1');
    expect(scanOfStored('f1')).toBe('ok');
    expect(scanStateOfRequestError({ response: { status: 423, data: { code: 'file_pending_scan' } } })).toBe('pending');
    expect(scanStateOfRequestError({ response: { status: 400, data: { message: 'file_infected' } } })).toBe('rejected');
    expect(scanStateOfRequestError({ response: { status: 500, data: {} } })).toBeNull();
  });
});
