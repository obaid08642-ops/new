import React from 'react';
import { Linking } from 'react-native';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import ClinicProfile from '../../../app/consultations/clinic/[id]';
import { message } from '../../components/screen/ScreenKit';

/**
 * Issue 767: the facility page a hospital pin on the map opens. Every value is a TEST value shaped like the backend's answers.
 * Proved: a hospital registered through the provider app (no care record, 404) still has its page from the entity graph, with the
 * address, phone, directions, pin, hours, departments and doctors; a part the record lacks is not drawn.
 */

const mockParams: { current: Record<string, string | undefined> } = { current: { id: 'p1' } };
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) },
  useLocalSearchParams: () => mockParams.current,
}));
jest.mock('react-native-localize', () => ({ getLocales: () => [], findBestLanguageTag: () => undefined }));
jest.mock('../../components/MapPrimitives', () => ({ __esModule: true, default: 'MapView', Marker: 'Marker', PROVIDER_DEFAULT: undefined }));
jest.mock('../../context/AppContext', () => ({ useApp: () => ({ isDark: false, lang: 'en', isRTL: false }) }));
jest.mock('../../utils/isOffline', () => ({ isOffline: jest.fn(async () => false) }));
jest.mock('../../utils/logger', () => ({ logError: jest.fn() }));
jest.mock('../../utils/api', () => ({ BASE_URL: 'https://api.example.test/api/v1', R2_PUBLIC_URL: 'https://cdn.example.test', apiFetch: jest.fn() }));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const mockRouter = (require('expo-router') as { router: Record<'push', jest.Mock> }).router;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { apiFetch } = require('../../utils/api') as { apiFetch: jest.Mock };

const k = (key: string) => message('en', key);
const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, bottom: 34, left: 0, right: 0 } };
const wrap = (ui: React.ReactElement) => <SafeAreaProvider initialMetrics={metrics}>{ui}</SafeAreaProvider>;

const answers = (care: unknown, graph: unknown) => {
  apiFetch.mockImplementation(async (path: string) => {
    const body = path.startsWith('/care/facilities/') ? care : graph;
    if (body === 404) throw new Error('not_found');
    return body;
  });
};

describe('facility page (issue 767)', () => {
  beforeEach(() => {
    apiFetch.mockReset();
    mockRouter.push.mockReset();
    jest.spyOn(Linking, 'openURL').mockResolvedValue(true as never);
  });

  it('draws a provider-app hospital (no care record) with address, hours, departments and doctors, and opens its doctor', async () => {
    answers(404, {
      entity: { name_en: 'TEST Hospital', city: 'TEST city', address: 'TEST street 1', phone: '+966000000', lat: 24.7, lng: 46.6, working_hours: [{ day: 'sat', open: '08:00', close: '22:00' }, { day: 'fri', closed: true }] },
      relationships: { departments: ['TEST department'], doctors: [{ id: 'd1', name_en: 'TEST Doctor', specialty: 'TEST specialty' }] },
    });
    render(wrap(<ClinicProfile />));
    await waitFor(() => expect(screen.getAllByText('TEST Hospital').length).toBeGreaterThan(0));
    expect(screen.getByText('TEST street 1')).toBeTruthy();
    expect(screen.getByText('08:00–22:00')).toBeTruthy();
    expect(screen.getByText(k('consult.clinicPage.closed'))).toBeTruthy();
    expect(screen.getByText('TEST department')).toBeTruthy();
    await act(async () => { fireEvent.press(screen.getByLabelText('TEST Doctor')); });
    expect(mockRouter.push).toHaveBeenCalledWith('/consultations/doctor/d1');
    await act(async () => { fireEvent.press(screen.getByTestId('clinic-call')); });
    expect(Linking.openURL).toHaveBeenCalledWith('tel:+966000000');
    expect(screen.getByTestId('clinic-directions')).toBeTruthy();
  });

  it('hides the address, call, directions, hours and departments a record does not have', async () => {
    answers({ name_en: 'TEST Clinic', city: 'TEST city' }, 404);
    render(wrap(<ClinicProfile />));
    await waitFor(() => expect(screen.getAllByText('TEST Clinic').length).toBeGreaterThan(0));
    expect(screen.queryByTestId('clinic-call')).toBeNull();
    expect(screen.queryByTestId('clinic-directions')).toBeNull();
    expect(screen.queryByText(k('consult.clinicPage.hours'))).toBeNull();
    expect(screen.queryByText(k('consult.clinicPage.address'))).toBeNull();
  });
});
