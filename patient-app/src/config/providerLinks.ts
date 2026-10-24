/**
 * Where a provider (doctor, clinic, pharmacy...) signs in. Read from the build's env, never invented: a link that is
 * not configured is simply not shown (and is listed in needs-review).
 */
const clean = (v: string | undefined): string | null => {
  const t = (v || '').trim();
  return /^https:\/\//i.test(t) ? t : null;
};

export interface ProviderLinks { web: string | null; ios: string | null; android: string | null }

export function providerLinks(env: Record<string, string | undefined> = process.env): ProviderLinks {
  return {
    web: clean(env.EXPO_PUBLIC_PROVIDER_WEB_URL),
    ios: clean(env.EXPO_PUBLIC_PROVIDER_APP_IOS_URL),
    android: clean(env.EXPO_PUBLIC_PROVIDER_APP_ANDROID_URL),
  };
}
