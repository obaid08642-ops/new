import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as AuthSession from 'expo-auth-session';

import { apiFetch } from '../../utils/api';
import { decodeJwt } from '../utils/jwt';
import { STORAGE_KEYS } from '../constants';

import type { SocialProvider } from '../components/auth/AuthKit';

WebBrowser.maybeCompleteAuthSession();

export type { SocialProvider };

/** Plain copy, Arabic source text: the components translate it through the i18n layer. */
export const SOCIAL_UNAVAILABLE = 'هذه الطريقة غير متاحة الآن. استخدم البريد أو رقم الجوال.';
export const SOCIAL_FAILED = 'تعذّر تسجيل الدخول الآن. حاول مرة أخرى.';

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
 *  - X and Snapchat: authorization code + PKCE. The CODE, the PKCE `code_verifier` and the same
 *    redirect URI go to the backend, which exchanges them with its own client secret, so no provider
 *    token is ever minted on the device (R12.social-xs).
 *  - Apple (iOS): `signInAsync`; the identity token goes to the backend with the name and email when Apple
 *    returns them (first sign-in only).
 *
 * Every path ends in `POST /auth/social-login` and the same session handling as the password login.
 * When the backend answers `needs_contact` (a provider account with no confirmed email) the user is
 * taken to add a phone or email. A provider without a client id in this build shows the plain
 * "not available" message; the X and Snapchat buttons stay behind EXPO_PUBLIC_SOCIAL_X_SNAPCHAT.
 */
export function useSocialLogin() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const redirectUri = useMemo(() => AuthSession.makeRedirectUri({ scheme: 'nabdplus' }), []);

  /** Store the session and tell the caller where the user belongs next. */
  const persist = useCallback(async (res: any) => {
    const jwtToken = typeof res?.token === 'string' ? res.token : res?.token?.accessToken || null;
    if (!jwtToken) throw new Error('no_session');
    try {
      await SecureStore.setItemAsync(STORAGE_KEYS.AUTH_TOKEN, jwtToken);
    } catch (_err) {
      await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, jwtToken);
    }
    return decodeJwt(jwtToken);
  }, []);

  /** Where a finished sign-in lands. needs_contact means "no email yet": add one. */
  const goNext = useCallback((decoded: any, needsContact: boolean) => {
    if (needsContact || decoded?.role !== 'patient') router.replace('/(auth)/provider-info' as any);
    else router.replace('/(tabs)');
  }, []);

  const finish = useCallback(
    async (provider: SocialProvider, token: string, extra?: { email?: string; name?: string }) => {
      try {
        setBusy(true);
        const body: Record<string, string> = { provider, token };
        if (extra?.email) body.email = extra.email;
        if (extra?.name) body.name = extra.name;
        const res = await apiFetch('/auth/social-login', { method: 'POST', body: JSON.stringify(body) });
        const decoded = await persist(res);
        goNext(decoded, res?.needs_contact === true);
      } catch (_err) {
        setError(SOCIAL_FAILED);
      } finally {
        setBusy(false);
      }
    },
    [persist, goNext],
  );

  /** R12.social-xs: X and Snapchat send the code; the backend does the exchange. */
  const finishWithCode = useCallback(
    async (provider: 'x' | 'snapchat', code: string, codeVerifier: string) => {
      try {
        setBusy(true);
        const res = await apiFetch('/auth/social-login', {
          method: 'POST',
          body: JSON.stringify({
            provider,
            code,
            code_verifier: codeVerifier,
            redirect_uri: redirectUri,
          }),
        });
        const decoded = await persist(res);
        goNext(decoded, res?.needs_contact === true);
      } catch (_err) {
        setError(SOCIAL_FAILED);
      } finally {
        setBusy(false);
      }
    },
    [persist, goNext, redirectUri],
  );

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
        // The server exchanges the code with its own client secret; the device holds no token.
        await finishWithCode(provider, code, request.codeVerifier);
      } catch (_err) {
        setError(SOCIAL_FAILED);
        setBusy(false);
      }
    },
    [finishWithCode],
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
          await codeFlow('x', xClientId, xReq, xPrompt);
        } else {
          await codeFlow('snapchat', snapClientId, snapReq, snapPrompt);
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
