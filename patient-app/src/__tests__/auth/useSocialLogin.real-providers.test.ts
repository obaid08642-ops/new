import { readFileSync } from 'fs';
import { join } from 'path';

// Issue 411: expo-auth-session's Google provider checks the platform client id while rendering
// (useAuthRequest -> invariantClientId). The real check throws only for an undefined id; the hook passes '' when the
// build has no EXPO_PUBLIC_GOOGLE_* id, so Welcome and Login render and the press says "not available"
// (useSocialLogin.test.ts). X and Snapchat requests (AuthRequest) have no client-id check at all.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { invariantClientId } = require(require.resolve('expo-auth-session/package.json').replace('package.json', 'build/providers/ProviderUtils.js')) as { invariantClientId: (name: string, value: string | undefined, provider: string) => void };

describe('social sign-in with no client ids in the build (real expo-auth-session check)', () => {
  it('an empty id does not throw while rendering; only an undefined one would', () => {
    for (const name of ['iosClientId', 'androidClientId', 'webClientId']) {
      expect(() => invariantClientId(name, '', 'Google')).not.toThrow();
      expect(() => invariantClientId(name, undefined, 'Google')).toThrow(/must be defined/);
    }
  });

  it('the hook always passes a string for every Google id (never undefined)', () => {
    const src = readFileSync(join(__dirname, '../../hooks/useSocialLogin.ts'), 'utf8');
    const call = src.slice(src.indexOf('Google.useAuthRequest('), src.indexOf('});', src.indexOf('Google.useAuthRequest(')));
    for (const key of ['clientId', 'iosClientId', 'androidClientId']) {
      expect(call).toMatch(new RegExp(`\\b${key}: (config\\?\\.google\\.[a-z_]+ \\|\\| )?process\\.env\\.EXPO_PUBLIC_GOOGLE_[A-Z_]*CLIENT_ID \\|\\| ''`));
    }
  });
});
