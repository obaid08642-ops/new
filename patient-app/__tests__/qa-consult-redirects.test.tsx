import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

/** QA audit: the two legacy consultation redirects keep the id as one value and the waiting text is translated. */
let mockParams: Record<string, string> = {};
const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn() };
const mockRedirect = jest.fn((_props: { href: unknown }) => null);
jest.mock('react-native-localize', () => require('react-native-localize/mock'));
jest.mock('expo-router', () => ({
  get router() {
    return mockRouter;
  },
  Redirect: (props: { href: unknown }) => mockRedirect(props),
  useLocalSearchParams: () => mockParams,
}));
jest.mock('../src/context/AppContext', () => ({
  useApp: () => ({ isDark: false, lang: 'en', isRTL: false, colors: { background: '#fff', primary: '#000', textSecondary: '#555' } }),
}));

import DoctorProfileRedirect from '../app/consultations/doctor-profile';
import WaitingRoomRedirect from '../app/consultations/waiting-room';

const EN = require('../src/i18n/locales/en.json') as Record<string, string>;
const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, bottom: 34, left: 0, right: 0 } };
const wrap = (ui: React.ReactElement) => <SafeAreaProvider initialMetrics={metrics}>{ui}</SafeAreaProvider>;

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = {};
});

describe('/consultations/doctor-profile (legacy redirect)', () => {
  it('opens the canonical profile with the id encoded and says so in the app language', async () => {
    mockParams = { id: 'dr a/b' };
    await render(wrap(<DoctorProfileRedirect />));
    expect(mockRouter.replace).toHaveBeenCalledWith('/consultations/doctor/dr%20a%2Fb');
    expect(screen.getByText(EN['link.opening.doctor'])).toBeTruthy();
  });

  it('without an id goes to the doctor search', async () => {
    await render(wrap(<DoctorProfileRedirect />));
    expect(mockRouter.replace).toHaveBeenCalledWith('/consultations/doctor-search');
  });
});

describe('/consultations/waiting-room (legacy redirect)', () => {
  it('keeps the id as one query value, so it cannot add parameters', async () => {
    mockParams = { id: 'a1&view=x' };
    await render(wrap(<WaitingRoomRedirect />));
    expect(mockRedirect).toHaveBeenCalledWith({ href: '/consultations/virtual-waiting-room?id=a1%26view%3Dx' });
  });

  it('without an id opens the waiting room alone', async () => {
    await render(wrap(<WaitingRoomRedirect />));
    expect(mockRedirect).toHaveBeenCalledWith({ href: '/consultations/virtual-waiting-room' });
  });
});
