// Q107: the backend verifies only Google and Apple sign-in (it can check their tokens) and
// refuses X and Snapchat. Batch 0 builds the buttons from availableSocialProviders(), so this
// checks that list, and that no screen draws a provider button of its own.
import * as fs from 'fs';
import * as path from 'path';
import { Platform } from 'react-native';
import { availableSocialProviders } from '../components/auth/AuthKit';

jest.mock('../context/AppContext', () => ({ useApp: () => ({ isDark: false, lang: 'ar', isRTL: true }) }));
jest.mock('../components/NabdLogo', () => ({ NabdLogo: () => null }));
jest.mock('expo-apple-authentication', () => ({
  AppleAuthenticationButton: () => null,
  AppleAuthenticationButtonType: { CONTINUE: 1 },
  AppleAuthenticationButtonStyle: { WHITE: 0, BLACK: 2 },
  AppleAuthenticationScope: { FULL_NAME: 0, EMAIL: 1 },
  signInAsync: jest.fn(),
}));

describe('patient app offers only verifiable social sign-in (Q107)', () => {
  const saved = process.env.EXPO_PUBLIC_SOCIAL_X_SNAPCHAT;
  afterEach(() => {
    jest.restoreAllMocks();
    if (saved === undefined) delete process.env.EXPO_PUBLIC_SOCIAL_X_SNAPCHAT;
    else process.env.EXPO_PUBLIC_SOCIAL_X_SNAPCHAT = saved;
  });

  it.each(['ios', 'android', 'web'] as const)('%s: no X or Snapchat provider by default', (os) => {
    delete process.env.EXPO_PUBLIC_SOCIAL_X_SNAPCHAT;
    jest.replaceProperty(Platform, 'OS', os);
    const list = availableSocialProviders();
    expect(list).toContain('google');
    expect(list).not.toContain('x');
    expect(list).not.toContain('snapchat');
  });

  for (const screen of ['login.tsx', 'register.tsx', 'welcome.tsx']) {
    it(`${screen} takes its providers from availableSocialProviders(), not a list of its own`, () => {
      const src = fs.readFileSync(path.join(__dirname, '..', '..', 'app', '(auth)', screen), 'utf8');
      expect(src).not.toMatch(/snapchat-ghost|x-twitter|EXPO_PUBLIC_X_CLIENT_ID|EXPO_PUBLIC_SNAPCHAT_CLIENT_ID|providers=\{\[/);
    });
  }
});
