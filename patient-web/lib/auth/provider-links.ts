export type ProviderLinks = { web: string | null; ios: string | null; android: string | null };

/** Only an absolute https URL is shown; anything else (unset, malformed, javascript:) is treated as not configured. */
export function httpsUrl(value: string | undefined | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" ? url.toString() : null;
  } catch { return null; }
}

/** Provider web and store links come from the deployment config only; there is no built-in URL. Literal env reads so the bundler inlines them. */
export function providerLinks(env: { web?: string; ios?: string; android?: string } = {
  web: process.env.NEXT_PUBLIC_PROVIDER_WEB_URL,
  ios: process.env.NEXT_PUBLIC_PROVIDER_APP_IOS_URL,
  android: process.env.NEXT_PUBLIC_PROVIDER_APP_ANDROID_URL,
}): ProviderLinks {
  return { web: httpsUrl(env.web), ios: httpsUrl(env.ios), android: httpsUrl(env.android) };
}
