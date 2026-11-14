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
import { SNAPCHAT_REDIRECT_URI, SNAPCHAT_RETURN_URL, SNAPCHAT_SCOPES } from '../utils/socialRedirects';
import { useSocialConfig } from './useSocialConfig';

import type { SocialProvider } from '../components/auth/AuthKit';
import type { SocialRuntimeConfig } from './useSocialConfig';

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

/** The id for this platform: the backend's answer (GET /auth/social/config) first, then the build's public env (Expo inlines each literal reference). */
function googleClientId(config: SocialRuntimeConfig | null): string {
  const runtime = config?.google;
  const id =
    Platform.OS === 'ios'
      ? runtime?.ios_client_id || process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID
      : Platform.OS === 'android'
        ? runtime?.android_client_id || process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID
        : runtime?.client_id || process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;
  return id || '';
}

/**
 * Social sign-in for Welcome and Login, in one place.
 *
 *  - Google: expo-auth-session's Google provider; its `authentication.accessToken` goes to the backend.
 *  - X and Snapchat: authorization code + PKCE; the code, the request's `codeVerifier` and the redirect URI go to the backend,
 *    which exchanges them with its own client secret (it refuses a raw access token, and the redirect URI must be on its allow-list).
 *  - Apple (iOS): `signInAsync`; the identity token goes to the backend with the name and email when Apple
 *    returns them (first sign-in only).
 *
 * Every path ends in `POST /auth/social-login` and the same session handling as the password login. The client ids come from
 * the backend's GET /auth/social/config (the build's EXPO_PUBLIC_* values are the fallback); a provider without one shows the
 * plain "not available" message; nothing sensitive is logged.
 */
export function useSocialLogin() {
  const dispatch = useDispatch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const config = useSocialConfig();
  const redirectUri = useMemo(() => AuthSession.makeRedirectUri({ scheme: 'nabdplus' }), []);

  const finish = useCallback(async (provider: SocialProvider, credential: { token: string } | { code: string; code_verifier: string; redirect_uri: string }, extra?: { email?: string; name?: string }) => {
    try {
      setBusy(true);
      const body: Record<string, string> = { provider, ...credential };
      if (extra?.email) body.email = extra.email;
      if (extra?.name) body.name = extra.name;
      // skipAuth: a refused provider token answers 401, which must not delete the guest session that is stored
      const res = await apiFetch('/auth/social-login', { method: 'POST', body: JSON.stringify(body), skipAuth: true });
      // both tokens go to secure storage only (never AsyncStorage) and the auth slice learns of the user: the same
      // session start as the password login
      const session = await startSession(res, dispatch);
      if (!session.ok && session.reason === 'not_patient') {
        router.replace('/(auth)/provider-info' as any);
        return;
      }
      if (!session.ok) throw new Error(session.reason);
      router.replace('/(tabs)');
    } catch (_err) {
      setError(SOCIAL_FAILED);
    } finally {
      setBusy(false);
    }
  }, [dispatch]);

  // Google
  const [googleReq, googleRes, googlePrompt] = Google.useAuthRequest({
    clientId: config?.google.client_id || process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '',
    iosClientId: config?.google.ios_client_id || process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '',
    androidClientId: config?.google.android_client_id || process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || '',
  });
  useEffect(() => {
    if (googleRes?.type === 'success' && googleRes.authentication?.accessToken) {
      void finish('google', { token: googleRes.authentication.accessToken });
    } else if (googleRes?.type === 'error') {
      setError(SOCIAL_FAILED);
      setBusy(false);
    } else if (googleRes && googleRes.type !== 'success') {
      setBusy(false);
    }
  }, [googleRes, finish]);

  // X and Snapchat: code + PKCE
  const xClientId = config?.x.client_id || process.env.EXPO_PUBLIC_X_CLIENT_ID || '';
  const snapClientId = config?.snapchat.client_id || process.env.EXPO_PUBLIC_SNAPCHAT_CLIENT_ID || '';
  const [xReq, , xPrompt] = AuthSession.useAuthRequest(
    { clientId: xClientId, scopes: ['tweet.read', 'users.read', 'offline.access'], redirectUri, usePKCE: true },
    X_DISCOVERY,
  );
  const [snapReq] = AuthSession.useAuthRequest(
    { clientId: snapClientId, scopes: SNAPCHAT_SCOPES, redirectUri: SNAPCHAT_REDIRECT_URI, usePKCE: true },
    SNAPCHAT_DISCOVERY,
  );
  // Snapchat's redirect is the HTTPS bridge page, so the in-app browser is told to stop at nabdplus://login/app-callback instead
  // (the request's own prompt would wait for the HTTPS address); the returned URL is checked against the request's state.
  const snapPrompt = useCallback(async (): Promise<AuthSession.AuthSessionResult> => {
    if (!snapReq) return { type: 'error' } as AuthSession.AuthSessionResult;
    const authUrl = await snapReq.makeAuthUrlAsync(SNAPCHAT_DISCOVERY);
    const result = await WebBrowser.openAuthSessionAsync(authUrl, SNAPCHAT_RETURN_URL);
    if (result.type !== 'success') return { type: result.type === 'cancel' ? 'cancel' : 'dismiss' } as AuthSession.AuthSessionResult;
    return snapReq.parseReturnUrl(result.url);
  }, [snapReq]);

  const codeFlow = useCallback(
    async (
      provider: 'x' | 'snapchat',
      clientId: string,
      request: AuthSession.AuthRequest | null,
      prompt: () => Promise<AuthSession.AuthSessionResult>,
      redirect: string,
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
        await finish(provider, { code, code_verifier: request.codeVerifier, redirect_uri: redirect });
      } catch (_err) {
        setError(SOCIAL_FAILED);
        setBusy(false);
      }
    },
    [finish],
  );

  const appleLogin = useCallback(async () => {
    try {
      setBusy(true);
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL],
      });
      if (!credential.identityToken) throw new Error('no_identity_token');
      const name = [credential.fullName?.givenName, credential.fullName?.familyName].filter(Boolean).join(' ');
      await finish('apple', { token: credential.identityToken }, { email: credential.email || undefined, name: name || undefined });
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
          if (!googleClientId(config) || !googleReq) {
            setError(SOCIAL_UNAVAILABLE);
          } else {
            setBusy(true);
            await googlePrompt();
          }
        } else if (provider === 'x') {
          await codeFlow('x', xClientId, xReq, xPrompt, redirectUri);
        } else {
          await codeFlow('snapchat', snapClientId, snapReq, snapPrompt, SNAPCHAT_REDIRECT_URI);
        }
      } catch (_err) {
        setError(SOCIAL_FAILED);
        setBusy(false);
      } finally {
        inFlight.current = false;
      }
    },
    [appleLogin, codeFlow, config, googlePrompt, googleReq, snapClientId, snapPrompt, snapReq, xClientId, xPrompt, xReq],
  );

  return { signIn, busy, error, clearError: () => setError(null) };
}
