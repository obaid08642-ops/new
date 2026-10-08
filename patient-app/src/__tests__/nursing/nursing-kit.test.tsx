import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { NurseCard, ServiceCard, nursingStatus, serviceGlyph } from '../../components/nursing/NursingKit';

/**
 * Batch 4, slice 4-app: the shared nursing pieces. Every value is a TEST value. What is proved: the status helper maps the
 * server's words and never shows a raw code; the service card presses (open and quick book) and the nurse card draws only
 * what it is given (no rating, distance or price invented) and its select action fires.
 */

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) },
}));
jest.mock('react-native-localize', () => ({ getLocales: () => [], findBestLanguageTag: () => undefined }));
jest.mock('../../context/AppContext', () => ({ useApp: () => ({ isDark: false, lang: 'en', isRTL: false }) }));

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, bottom: 34, left: 0, right: 0 } };
const wrap = (ui: React.ReactElement) => <SafeAreaProvider initialMetrics={metrics}>{ui}</SafeAreaProvider>;

describe('nursingStatus', () => {
  it('maps the known states to a label key and a tone', () => {
    expect(nursingStatus('COMPLETED')).toEqual({ key: 'nur.status.completed', tone: 'success' });
    expect(nursingStatus('REJECTED').tone).toBe('danger');
    expect(nursingStatus('PENDING_INSURANCE').tone).toBe('warning');
    expect(nursingStatus('confirmed').key).toBe('nur.status.confirmed');
  });
  it('shows an unknown or missing state as "other", never the raw code', () => {
    expect(nursingStatus('SOMETHING_NEW')).toEqual({ key: 'nur.status.other', tone: 'neutral' });
    expect(nursingStatus(undefined).key).toBe('nur.status.other');
  });
  it('gives every service a glyph in the nursing tone', () => {
    expect(serviceGlyph('svc-iv').icon).toBe('drop');
    expect(serviceGlyph('unknown').icon).toBe('first-aid-kit');
  });
});

describe('ServiceCard', () => {
  it('opens the service and books from the quick action', async () => {
    const onPress = jest.fn();
    const onAction = jest.fn();
    await render(wrap(<ServiceCard title="Service one" desc="A line" icon="drop" price={150} onPress={onPress} actionLabel="Book now" onAction={onAction} />));
    expect(screen.getByText('Service one')).toBeTruthy();
    expect(screen.getByText(/150\.00/)).toBeTruthy();
    await act(async () => {
      fireEvent.press(screen.getByText('Service one'));
    });
    expect(onPress).toHaveBeenCalledTimes(1);
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Book now, Service one'));
    });
    expect(onAction).toHaveBeenCalledTimes(1);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('draws no price when the server sent none', async () => {
    await render(wrap(<ServiceCard title="Service two" icon="drop" price={null} onPress={jest.fn()} actionLabel="Book now" onAction={jest.fn()} />));
    expect(screen.queryByText(/SAR/)).toBeNull();
  });
});

describe('NurseCard', () => {
  it('draws the facts it is given and select fires', async () => {
    const onPress = jest.fn();
    await render(wrap(<NurseCard name="Nurse one" facility="Facility one" rating={4.7} distance="3 km away" availableLabel={{ label: 'Available now', tone: 'mint' }} price={120} priceFallback="Set at booking" actionLabel="Select" onPress={onPress} />));
    expect(screen.getByText('Facility one')).toBeTruthy();
    expect(screen.getByText('4.7')).toBeTruthy();
    expect(screen.getByText('3 km away')).toBeTruthy();
    expect(screen.getByText('Available now')).toBeTruthy();
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Select, Nurse one'));
    });
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('invents no rating, distance or price', async () => {
    await render(wrap(<NurseCard name="Nurse two" rating={null} price={null} priceFallback="Set at booking" actionLabel="Select" onPress={jest.fn()} />));
    expect(screen.getByText('Set at booking')).toBeTruthy();
    expect(screen.queryByText(/km/)).toBeNull();
    expect(screen.queryByText('0')).toBeNull();
  });
});
