import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { router } from 'expo-router';
import { useDispatch } from 'react-redux';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as AuthSession from 'expo-auth-session';

import { apiFetch } from '../../utils/api';
import { startSession } from '../utils/authSession';

import type { SocialProvider } from '../components/auth/AuthKit';

WebBrowser.maybeCompleteAuthSession();

export type { SocialProvider };

/** Plain copy, Arabic source text: the components translate it through the i18n layer. */
export const SOCIAL_UNAVAILABLE = 'auth.social.unavailable';
export const SOCIAL_FAILED = 'auth.social.failed';

const X_DISCOVERY = {
  authorizationEndpoint: 'https://twitter.com/i/oauth2/authorize',
  tokenEndpoint: 'https://api.twitter.com/2/oauth2/token',
};
const SNAPCHAT_DISCOVERY = {
  authorizationEndpoint: 'https://accounts.snapchat.com/accounts/oauth2/auth',
  tokenEndpoint: 'https://accounts.snapchat.com/accounts/oauth2/token',
};

/** Read at call time from the build's public env (Expo inlines each literal reference). */
function googleClientId(): string {
  const id =
    Platform.OS === 'ios'
      ? process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID
      : Platform.OS === 'android'
        ? process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID
        : process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;
  return id || '';
}

/**
 * Social sign-in for Welcome and Login, in one place.
 *
 *  - Google: expo-auth-session's Google provider; its `authentication.accessToken` goes to the backend.
 *  - X and Snapchat: authorization code + PKCE, then `AuthSession.exchangeCodeAsync` (the request's
 *    `codeVerifier`, the same redirect URI and token endpoint) and the resulting access token goes to the backend.
 *  - Apple (iOS): `signInAsync`; the identity token goes to the backend with the name and email when Apple
 *    returns them (first sign-in only).
 *
 * Every path ends in `POST /auth/social-login { provider, token }` and the same session handling as the
 * password login. A provider without a client id in this build shows the plain "not available" message;
 * nothing sensitive is logged.
 */
export function useSocialLogin() {
  const dispatch = useDispatch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const redirectUri = useMemo(() => AuthSession.makeRedirectUri({ scheme: 'nabdplus' }), []);

  const finish = useCallback(async (provider: SocialProvider, token: string, extra?: { email?: string; name?: string }) => {
    try {
      setBusy(true);
      const body: Record<string, string> = { provider, token };
      if (extra?.email) body.email = extra.email;
      if (extra?.name) body.name = extra.name;
      // skipAuth: a refused provider token answers 401, which must not delete the guest session that is stored
      const res = await apiFetch('/auth/social-login', { method: 'POST', body: JSON.stringify(body), skipAuth: true });
      // both tokens go to secure storage only (never AsyncStorage) and the auth slice learns of the user: the same
      // session start as the password login
      const session = await startSession(res, dispatch);
      if (!session.ok) throw new Error(session.reason);
      if (session.role !== 'patient') router.replace('/(auth)/provider-info' as any);
      else router.replace('/(tabs)');
    } catch (_err) {
      setError(SOCIAL_FAILED);
    } finally {
      setBusy(false);
    }
  }, [dispatch]);

  // Google
  const [googleReq, googleRes, googlePrompt] = Google.useAuthRequest({
    clientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '',
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '',
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || '',
  });
  useEffect(() => {
    if (googleRes?.type === 'success' && googleRes.authentication?.accessToken) {
      void finish('google', googleRes.authentication.accessToken);
    } else if (googleRes?.type === 'error') {
      setError(SOCIAL_FAILED);
      setBusy(false);
    } else if (googleRes && googleRes.type !== 'success') {
      setBusy(false);
    }
  }, [googleRes, finish]);

  // X and Snapchat: code + PKCE
  const xClientId = process.env.EXPO_PUBLIC_X_CLIENT_ID || '';
  const snapClientId = process.env.EXPO_PUBLIC_SNAPCHAT_CLIENT_ID || '';
  const [xReq, , xPrompt] = AuthSession.useAuthRequest(
    { clientId: xClientId, scopes: ['tweet.read', 'users.read', 'offline.access'], redirectUri, usePKCE: true },
    X_DISCOVERY,
  );
  const [snapReq, , snapPrompt] = AuthSession.useAuthRequest(
    { clientId: snapClientId, scopes: ['https://auth.snapchat.com/oauth2/api/user.display_name'], redirectUri, usePKCE: true },
    SNAPCHAT_DISCOVERY,
  );

  const codeFlow = useCallback(
    async (
      provider: 'x' | 'snapchat',
      clientId: string,
      request: AuthSession.AuthRequest | null,
      prompt: () => Promise<AuthSession.AuthSessionResult>,
      tokenEndpoint: string,
    ) => {
      if (!clientId) {
        setError(SOCIAL_UNAVAILABLE);
        return;
      }
      if (!request) {
        setError(SOCIAL_FAILED);
        return;
      }
      try {
        setBusy(true);
        const result = await prompt();
        if (result.type !== 'success') {
          if (result.type === 'error') setError(SOCIAL_FAILED);
          setBusy(false);
          return;
        }
        const code = result.params?.code;
        if (!code || !request.codeVerifier) throw new Error('no_code');
        const tokens = await AuthSession.exchangeCodeAsync(
          { clientId, code, redirectUri, extraParams: { code_verifier: request.codeVerifier } },
          { tokenEndpoint },
        );
        if (!tokens.accessToken) throw new Error('no_access_token');
        await finish(provider, tokens.accessToken);
      } catch (_err) {
        setError(SOCIAL_FAILED);
        setBusy(false);
      }
    },
    [finish, redirectUri],
  );

  const appleLogin = useCallback(async () => {
    try {
      setBusy(true);
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL],
      });
      if (!credential.identityToken) throw new Error('no_identity_token');
      const name = [credential.fullName?.givenName, credential.fullName?.familyName].filter(Boolean).join(' ');
      await finish('apple', credential.identityToken, { email: credential.email || undefined, name: name || undefined });
    } catch (e: any) {
      if (e?.code !== 'ERR_REQUEST_CANCELED') setError(SOCIAL_FAILED);
      setBusy(false);
    }
  }, [finish]);

  const inFlight = useRef(false);
  const signIn = useCallback(
    async (provider: SocialProvider) => {
      if (inFlight.current) return;
      inFlight.current = true;
      setError(null);
      try {
        if (provider === 'apple') {
          if (Platform.OS !== 'ios') setError(SOCIAL_UNAVAILABLE);
          else await appleLogin();
        } else if (provider === 'google') {
          if (!googleClientId() || !googleReq) {
            setError(SOCIAL_UNAVAILABLE);
          } else {
            setBusy(true);
            await googlePrompt();
          }
        } else if (provider === 'x') {
          await codeFlow('x', xClientId, xReq, xPrompt, X_DISCOVERY.tokenEndpoint);
        } else {
          await codeFlow('snapchat', snapClientId, snapReq, snapPrompt, SNAPCHAT_DISCOVERY.tokenEndpoint);
        }
      } catch (_err) {
        setError(SOCIAL_FAILED);
        setBusy(false);
      } finally {
        inFlight.current = false;
      }
    },
    [appleLogin, codeFlow, googlePrompt, googleReq, snapClientId, snapPrompt, snapReq, xClientId, xPrompt, xReq],
  );

  return { signIn, busy, error, clearError: () => setError(null) };
}
