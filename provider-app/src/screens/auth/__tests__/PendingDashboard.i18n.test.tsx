import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { PendingDashboard } from '../PendingDashboard';
import { translate, type Lang } from '../../../i18n';

jest.mock('../../../api/client', () => ({ __esModule: true, default: { get: jest.fn().mockResolvedValue({ data: {} }), post: jest.fn().mockResolvedValue({ data: {} }) } }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
// stable references, as the real providers keep them (a fresh t/show on every render would re-run the screen's effects forever)
jest.mock('../../../context', () => {
  const theme = new Proxy({}, { get: () => 'transparent' });
  const { translate: tr } = jest.requireActual('../../../i18n');
  const stable = {
    show: jest.fn(),
    user: { email: 'a@b.test', emailVerified: true },
    refreshSession: jest.fn(),
    theme: { theme, isDark: false },
    t: (k: string, p?: Record<string, string | number>) => tr((global as any).__lang, k, p),
  };
  return {
    useTheme: () => stable.theme,
    useLang: () => ({ lang: (global as any).__lang, isRTL: false, t: stable.t }),
    useAuth: () => ({ user: stable.user, refreshSession: stable.refreshSession }),
    useToast: () => ({ show: stable.show }),
  };
});

const noop = () => {};

describe('the rejected / pending status screen speaks all six languages', () => {
  it.each(['ar', 'en', 'ur', 'hi', 'bn', 'tl'] as const)('%s: title, resubmit action and logout come from the language file', async (lang) => {
    (global as any).__lang = lang;
    await render(<PendingDashboard status="rejected" onExplore={noop} onLogout={noop} onOpenDocuments={noop} />);
    expect(await screen.findByText(translate(lang, 'status.rejected.title'))).toBeTruthy();
    expect(screen.getByText(translate(lang, 'status.resubmit'))).toBeTruthy();
    expect(screen.getByText(translate(lang, 'logout'))).toBeTruthy();
  });

  it('the reason card shows the missing-reason text in the chosen language', async () => {
    (global as any).__lang = 'ur';
    await render(<PendingDashboard status="rejected" onExplore={noop} onLogout={noop} />);
    expect(await screen.findByText(translate('ur', 'status.noReason'))).toBeTruthy();
  });
});
