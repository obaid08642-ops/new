import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { FollowUpActions, GuaranteeLine, LicenseRow, useLateGuarantee } from '../../components/consult/Differentiators';
import { CopayFields } from '../../components/insurance/CopayFields';
import { message } from '../../components/screen/ScreenKit';

/** The visible parts of the differentiators. Every value is a TEST value. */

const mockApiFetch = jest.fn();
const mockPush = jest.fn();
jest.mock('expo-router', () => ({ router: { push: (...a: unknown[]) => mockPush(...a), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) }, useLocalSearchParams: () => ({}) }));
jest.mock('react-native-localize', () => ({ getLocales: () => [], findBestLanguageTag: () => undefined }));
jest.mock('../../context/AppContext', () => ({ useApp: () => ({ isDark: false, lang: 'en', isRTL: false }) }));
jest.mock('../../utils/api', () => ({ apiFetch: (...a: unknown[]) => mockApiFetch(...a), BASE_URL: 'https://api.example.test/api/v1' }));
jest.mock('../../utils/logger', () => ({ logError: jest.fn() }));

const k = (key: string, vars?: Record<string, string | number>) => message('en', key, vars);
const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, bottom: 34, left: 0, right: 0 } };
const wrap = (ui: React.ReactElement) => <SafeAreaProvider initialMetrics={metrics}>{ui}</SafeAreaProvider>;

beforeEach(() => {
  mockApiFetch.mockReset();
  mockPush.mockReset();
});

describe('guarantee line', () => {
  it('shows the server minutes and points', async () => {
    await render(wrap(<GuaranteeLine guarantee={{ minutes: 30, points: 50 }} testID="g" />));
    expect(screen.getByTestId('g')).toBeTruthy();
    expect(screen.getByText(k('consult.guarantee.line', { minutes: 30, points: 50 }))).toBeTruthy();
    expect(k('consult.guarantee.line', { minutes: 30, points: 50 })).toContain('30');
  });
  it('draws nothing without a setting', async () => {
    await render(wrap(<GuaranteeLine guarantee={null} testID="g" />));
    expect(screen.queryByTestId('g')).toBeNull();
  });
  function Probe() {
    return <GuaranteeLine guarantee={useLateGuarantee()} testID="probe" />;
  }
  it('the hook reads GET /system-config/public', async () => {
    mockApiFetch.mockResolvedValueOnce({ late_guarantee: { minutes: 20, points: 10 } });
    await render(wrap(<Probe />));
    expect(await screen.findByTestId('probe')).toBeTruthy();
    expect(mockApiFetch).toHaveBeenCalledWith('/system-config/public');
  });
  it('the hook gives nothing when the server has no setting', async () => {
    mockApiFetch.mockResolvedValueOnce({ cancellation_policy: null });
    await render(wrap(<Probe />));
    await waitFor(() => expect(mockApiFetch).toHaveBeenCalledTimes(1));
    expect(screen.queryByTestId('probe')).toBeNull();
  });
  it('the hook stays null when the request fails', async () => {
    mockApiFetch.mockRejectedValueOnce(new Error('network'));
    await render(wrap(<Probe />));
    await waitFor(() => expect(mockApiFetch).toHaveBeenCalledTimes(1));
    expect(screen.queryByTestId('probe')).toBeNull();
  });
});

describe('licence row', () => {
  it('shows "licensed by SCFHS, no. X" with the verified badge', async () => {
    await render(wrap(<LicenseRow license={{ number: '12-34', verified: true }} testID="l" />));
    expect(screen.getByText(k('consult.license.line', { number: '12-34' }))).toBeTruthy();
    expect(screen.getByText(k('consult.license.verified'))).toBeTruthy();
  });
  it('shows no badge when not verified', async () => {
    await render(wrap(<LicenseRow license={{ number: '12-34', verified: false }} testID="l" />));
    expect(screen.getByText(k('consult.license.line', { number: '12-34' }))).toBeTruthy();
    expect(screen.queryByText(k('consult.license.verified'))).toBeNull();
  });
  it('is hidden without a number', async () => {
    await render(wrap(<LicenseRow license={null} testID="l" />));
    expect(screen.queryByTestId('l')).toBeNull();
  });
});

describe('follow-up actions', () => {
  const rx = { kind: 'pharmacy_order' as const, prescriptionId: 'rx1' };
  const lab = { kind: 'lab_booking' as const, orderId: 'o1', firstItemId: 'i1' };
  const scan = { kind: 'radiology_booking' as const, orderId: 'o2', firstItemId: 'i2' };
  it('the prescription opens rx-order with its id', async () => {
    await render(wrap(<FollowUpActions actions={[rx]} />));
    expect(screen.getByText(k('consult.followUp.rx'))).toBeTruthy();
    await fireEvent.press(screen.getByTestId('follow-up-pharmacy_order-0'));
    expect(mockPush).toHaveBeenLastCalledWith({ pathname: '/pharmacy/rx-order', params: { prescriptionId: 'rx1' } });
    expect(mockApiFetch).not.toHaveBeenCalled();
  });
  it('labs and scans POST the group order, then open the ordering flow', async () => {
    mockApiFetch.mockResolvedValue({});
    await render(wrap(<FollowUpActions actions={[lab, scan]} />));
    await fireEvent.press(screen.getByTestId('follow-up-lab_booking-0'));
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith({ pathname: '/diagnostics/search' }));
    expect(mockApiFetch).toHaveBeenCalledWith('/medical-orders/o1/items/i1/order', { method: 'POST', body: JSON.stringify({ group_all: true }) });
    await fireEvent.press(screen.getByTestId('follow-up-radiology_booking-1'));
    await waitFor(() => expect(mockApiFetch).toHaveBeenCalledWith('/medical-orders/o2/items/i2/order', { method: 'POST', body: JSON.stringify({ group_all: true }) }));
  });
  it('a failed order shows an error and does not navigate', async () => {
    mockApiFetch.mockRejectedValue(new Error('x'));
    await render(wrap(<FollowUpActions actions={[lab]} />));
    await fireEvent.press(screen.getByTestId('follow-up-lab_booking-0'));
    expect(await screen.findByText(k('medorders.loadError'))).toBeTruthy();
    expect(mockPush).not.toHaveBeenCalled();
  });
  it('draws only the listed ones, and nothing for none', async () => {
    await render(wrap(<FollowUpActions actions={[lab]} testID="f" />));
    expect(screen.queryByTestId('follow-up-pharmacy_order-0')).toBeNull();
    expect(screen.getByTestId('follow-up-lab_booking-0')).toBeTruthy();
  });
  it('is hidden when the server lists none', async () => {
    await render(wrap(<FollowUpActions actions={[]} testID="f" />));
    expect(screen.queryByTestId('f')).toBeNull();
  });
});

describe('copay fields', () => {
  it('shows the hint and no error until asked, then the field error', async () => {
    const noop = jest.fn();
    const { rerender } = await render(wrap(<CopayFields percent="150" cap="" onPercent={noop} onCap={noop} showErrors={false} idPrefix="t" />));
    expect(screen.getByText(k('insurance.copay.hint'))).toBeTruthy();
    expect(screen.queryByText(k('insurance.copay.percentError'))).toBeNull();
    await rerender(wrap(<CopayFields percent="150" cap="" onPercent={noop} onCap={noop} showErrors idPrefix="t" />));
    expect(screen.getByText(k('insurance.copay.percentError'))).toBeTruthy();
    await rerender(wrap(<CopayFields percent="20" cap="-3" onPercent={noop} onCap={noop} showErrors idPrefix="t" />));
    expect(screen.getByText(k('insurance.copay.capError'))).toBeTruthy();
    expect(screen.queryByText(k('insurance.copay.percentError'))).toBeNull();
  });
  it('passes what is typed up', async () => {
    const onPercent = jest.fn();
    await render(wrap(<CopayFields percent="" cap="" onPercent={onPercent} onCap={jest.fn()} showErrors={false} idPrefix="t" />));
    await fireEvent.changeText(screen.getByTestId('t-copay-percent'), '20');
    expect(onPercent).toHaveBeenCalledWith('20');
  });
});
