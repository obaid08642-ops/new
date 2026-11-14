/**
 * What a client needs to offer social sign-in, read from the backend's own environment so a release needs no rebuild per key
 * (the web inlined NEXT_PUBLIC_* and the apps EXPO_PUBLIC_* at build time, and a build without them hid every button).
 * Only PUBLIC values are returned: client ids and redirect URIs. A secret never appears here.
 *
 * A provider is `enabled` when the backend can finish the sign-in (the credentials it verifies with are set) AND its gate is
 * on. A gate is `<PROVIDER>_SIGNIN_ENABLED`; unset means on, `false`/`0`/`off`/`no` switches the provider off.
 *
 *   google    GOOGLE_OAUTH_CLIENT_IDS (comma list the backend accepts as token audience)
 *             public ids: GOOGLE_WEB_CLIENT_ID (default: the first of the list), GOOGLE_IOS_CLIENT_ID, GOOGLE_ANDROID_CLIENT_ID;
 *             an id is only advertised when it is also in GOOGLE_OAUTH_CLIENT_IDS, so no client is told to use an id the backend refuses
 *   apple     APPLE_SIGNIN_CLIENT_IDS (comma list of audiences); the web button also needs APPLE_REDIRECT_URI;
 *             public web id: APPLE_WEB_CLIENT_ID (default: the first of the list)
 *   x         X_CLIENT_ID + X_CLIENT_SECRET + SOCIAL_REDIRECT_URIS
 *   snapchat  SNAPCHAT_CLIENT_ID + SNAPCHAT_CLIENT_SECRET + SOCIAL_REDIRECT_URIS
 */
type Env = Record<string, string | undefined>;

export interface SocialProviderConfig {
  enabled: boolean;
  client_id?: string;
  ios_client_id?: string;
  android_client_id?: string;
  redirect_uri?: string;
}

export interface SocialConfig {
  google: SocialProviderConfig;
  apple: SocialProviderConfig;
  x: SocialProviderConfig;
  snapchat: SocialProviderConfig;
}

const list = (value: string | undefined): string[] => String(value || '').split(',').map((v) => v.trim()).filter(Boolean);
const gateOn = (value: string | undefined): boolean => !['false', '0', 'off', 'no'].includes(String(value ?? '').trim().toLowerCase());
const one = (value: string | undefined): string | undefined => (value && value.trim() ? value.trim() : undefined);
const httpsUrl = (value: string | undefined): string | undefined => {
  const v = one(value);
  if (!v) return undefined;
  try {
    return new URL(v).protocol === 'https:' ? v : undefined;
  } catch {
    return undefined;
  }
};

export function buildSocialConfig(env: Env = process.env): SocialConfig {
  const googleIds = list(env.GOOGLE_OAUTH_CLIENT_IDS);
  const accepted = (id: string | undefined) => (id && googleIds.includes(id) ? id : undefined);
  const googleWeb = accepted(one(env.GOOGLE_WEB_CLIENT_ID)) ?? googleIds[0];
  const googleIos = accepted(one(env.GOOGLE_IOS_CLIENT_ID));
  const googleAndroid = accepted(one(env.GOOGLE_ANDROID_CLIENT_ID));

  const appleIds = list(env.APPLE_SIGNIN_CLIENT_IDS);
  const appleWeb = one(env.APPLE_WEB_CLIENT_ID) && appleIds.includes(String(env.APPLE_WEB_CLIENT_ID).trim()) ? String(env.APPLE_WEB_CLIENT_ID).trim() : appleIds[0];
  const appleRedirect = httpsUrl(env.APPLE_REDIRECT_URI);

  const codeReady = (prefix: 'X' | 'SNAPCHAT') => Boolean(one(env[`${prefix}_CLIENT_ID`]) && one(env[`${prefix}_CLIENT_SECRET`]) && list(env.SOCIAL_REDIRECT_URIS).length);

  return {
    google: {
      enabled: googleIds.length > 0 && gateOn(env.GOOGLE_SIGNIN_ENABLED),
      ...(googleWeb ? { client_id: googleWeb } : {}),
      ...(googleIos ? { ios_client_id: googleIos } : {}),
      ...(googleAndroid ? { android_client_id: googleAndroid } : {}),
    },
    apple: {
      // the app signs in natively (no ids needed); the web button also needs its service id and redirect URI, which are advertised when set
      enabled: appleIds.length > 0 && gateOn(env.APPLE_SIGNIN_ENABLED),
      ...(appleWeb ? { client_id: appleWeb } : {}),
      ...(appleRedirect ? { redirect_uri: appleRedirect } : {}),
    },
    x: { enabled: codeReady('X') && gateOn(env.X_SIGNIN_ENABLED), ...(one(env.X_CLIENT_ID) ? { client_id: one(env.X_CLIENT_ID) } : {}) },
    snapchat: { enabled: codeReady('SNAPCHAT') && gateOn(env.SNAPCHAT_SIGNIN_ENABLED), ...(one(env.SNAPCHAT_CLIENT_ID) ? { client_id: one(env.SNAPCHAT_CLIENT_ID) } : {}) },
  };
}
