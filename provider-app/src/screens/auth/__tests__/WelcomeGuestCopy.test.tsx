import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { WelcomeScreen } from '../AuthScreens';

jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('../../../context', () => {
  const theme = new Proxy({}, { get: () => 'transparent' });
  return {
    useTheme: () => ({ theme, mode: 'light', toggle: jest.fn(), isDark: false }),
    useLang: () => ({ lang: 'en', isRTL: false, toggle: jest.fn(), t: (k: string) => k }),
    useAuth: () => ({ bioLogin: jest.fn() }),
    useToast: () => ({ show: jest.fn() }),
  };
});

// Backend: POST /recruitment/jobs/guest and /jobs/:id/guest-apply are @Public and device-bound,
// so the welcome text must not claim that posting and applying need sign-in.
describe('WelcomeScreen guest copy', () => {
  it('tells guests they can post (reviewed) and apply on this device', async () => {
    await render(<WelcomeScreen onSelectType={() => {}} onLogin={() => {}} onGuestJobs={() => {}} onGuestDrugIndex={() => {}} />);
    expect(screen.getByText(/post a job \(reviewed before it goes live\) or apply, tied to this device/)).toBeTruthy();
    expect(screen.queryByText(/require sign-in/i)).toBeNull();
  });
});
