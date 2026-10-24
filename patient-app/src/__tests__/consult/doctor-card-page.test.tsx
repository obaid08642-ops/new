import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import DoctorProfile from '../../../app/consultations/doctor/[id]';
import { DoctorListCard } from '../../components/consult/DoctorListCard';
import { doctorRows } from '../../utils/doctorSearch';
import { message } from '../../components/screen/ScreenKit';

/** The richer doctor card and page (owner 2026-10-24): every fact is drawn only when the server sent it; TEST values. */

const mockParams: { current: Record<string, string | undefined> } = { current: { id: 'doc-1' } };
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) },
  useLocalSearchParams: () => mockParams.current,
}));
jest.mock('react-native-localize', () => ({ getLocales: () => [], findBestLanguageTag: () => undefined }));
jest.mock('../../context/AppContext', () => ({ useApp: () => ({ isDark: false, lang: 'en', isRTL: false }) }));
jest.mock('../../utils/isOffline', () => ({ isOffline: jest.fn(async () => false) }));
jest.mock('../../utils/logger', () => ({ logError: jest.fn() }));
jest.mock('../../utils/api', () => ({ BASE_URL: 'https://api.example.test/api/v1', R2_PUBLIC_URL: 'https://cdn.example.test', apiFetch: jest.fn() }));
jest.mock('../../components/MapPrimitives', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require('react-native');
  return { __esModule: true, default: ({ children }: { children?: React.ReactNode }) => <View testID="clinic-map">{children}</View>, Marker: () => null, PROVIDER_DEFAULT: 'default' };
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { apiFetch } = require('../../utils/api') as { apiFetch: jest.Mock };
const k = (key: string, vars?: Record<string, string | number>) => message('en', key, vars);
const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, bottom: 34, left: 0, right: 0 } };
const wrap = (ui: React.ReactElement) => <SafeAreaProvider initialMetrics={metrics}>{ui}</SafeAreaProvider>;
const pick = (ar: string | null, en: string | null) => en ?? ar;

const base = { id: 'doc-1', name_en: 'Test Doctor', specialty: 'Test specialty', consultation_modes: ['clinic', 'video'], price_clinic: 150, price_online: 100 };
function serve(doc: Record<string, unknown>) {
  apiFetch.mockImplementation(async (path: string) => {
    if (path.startsWith('/care/doctors/doc-1/slots')) return { slots: [] };
    if (path.startsWith('/care/doctors/doc-1')) return doc;
    return {};
  });
}

describe('doctor list card', () => {
  const [full] = doctorRows({ items: [{ id: 'a', name_en: 'Dr. A', gender: 'female', years_experience: 9, wait_time: 12, accepts_insurance: true, is_online: true, consultation_modes: ['clinic', 'online'], price_clinic: 200, price_online: 120, rating: 4.6, reviews_count: 8 }] }, pick, (i) => i);
  const [bare] = doctorRows({ items: [{ id: 'b', name_en: 'Dr. B' }] }, pick, (i) => i);

  it('shows the facts the server sent', async () => {
    await render(wrap(<DoctorListCard doctor={full} onPress={jest.fn()} onBook={jest.fn()} testID="c" />));
    expect(screen.getByText(k('consult.card.years', { n: '9' }))).toBeTruthy();
    expect(screen.getByText(k('consult.gender.female'))).toBeTruthy();
    expect(screen.getByText(k('consult.card.wait', { n: '12' }))).toBeTruthy();
    expect(screen.getByText(k('consult.card.insurance'))).toBeTruthy();
    expect(screen.getByLabelText(k('consult.doc.availableNow'))).toBeTruthy();
    expect(screen.getByText(/Clinic 200\.00/)).toBeTruthy();
    expect(screen.getByText(/Online 120\.00/)).toBeTruthy();
  });

  it('draws no facts strip and no placeholder for a bare record', async () => {
    await render(wrap(<DoctorListCard doctor={bare} onPress={jest.fn()} onBook={jest.fn()} testID="c" />));
    expect(screen.queryByTestId('c-facts')).toBeNull();
    expect(screen.queryByLabelText(k('consult.doc.availableNow'))).toBeNull();
  });
});

describe('doctor page', () => {
  it('shows honest empty states for education and reviews and no map, services or wait when the server sent none', async () => {
    serve(base);
    await render(wrap(<DoctorProfile />));
    await screen.findByText('Test Doctor');
    expect(screen.getByText(k('consult.doc.noEducation'))).toBeTruthy();
    expect(screen.getByTestId('doctor-reviews-empty')).toBeTruthy();
    expect(screen.queryByTestId('clinic-map')).toBeNull();
    expect(screen.queryByText(k('consult.doc.services'))).toBeNull();
  });

  it('draws services, follow-up, wait, the clinic map, reviewer names and a see-all list when sent', async () => {
    const reviews = [1, 2, 3, 4].map((n) => ({ rating: 5, text: `Great ${n}`, date: '2026-10-01T00:00:00.000Z', reviewer: `Rev${n}` }));
    serve({ ...base, education: 'MD, Test University', wait_time: 20, services: [{ id: 's1', name_en: 'Ultrasound', price: 80 }], follow_up_price: 50, follow_up_days: 14, location: { lat: 24.7, lng: 46.7 }, reviews_data: reviews });
    await render(wrap(<DoctorProfile />));
    await screen.findByText('Test Doctor');
    expect(screen.getByText('MD, Test University')).toBeTruthy();
    expect(screen.getByText('Ultrasound')).toBeTruthy();
    expect(screen.getByText(k('consult.doc.followUpWindow', { n: '14' }))).toBeTruthy();
    expect(screen.getByText(k('consult.doc.waitMinutes'))).toBeTruthy();
    expect(screen.getByTestId('clinic-map')).toBeTruthy();
    expect(screen.getByText('Rev1')).toBeTruthy();
    expect(screen.queryByText('Rev4')).toBeNull();
    await act(async () => {
      fireEvent.press(screen.getByText(k('consult.doc.seeAllReviews', { n: '4' })));
    });
    expect(await screen.findByText('Rev4')).toBeTruthy();
  });
});
