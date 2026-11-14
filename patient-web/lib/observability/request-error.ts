import * as Sentry from "@sentry/nextjs";

type RequestErrorArgs = Parameters<typeof Sentry.captureRequestError>;

/** `public data unavailable: <what>` (see lib/api/public-unavailable.ts); the class name may not survive Next's error serialisation. */
const UNAVAILABLE = /^public data unavailable: ([a-z0-9_-]+)$/i;

export function publicUnavailableWhat(error: unknown): string | null {
  if (!(error instanceof Error)) return null;
  if (error.name === "PublicDataUnavailableError") return (error as Error & { what?: string }).what ?? UNAVAILABLE.exec(error.message)?.[1] ?? "unknown";
  return UNAVAILABLE.exec(error.message)?.[1] ?? null;
}

const SEEN_MS = 10_000;
const seen = new Map<string, number>();

/**
 * An outage of the public backend is expected (stale-if-error, #302), not a bug of the page. generateMetadata and the page
 * both throw it for the same request, and every product/category has its own stack, so Sentry made one group per throw
 * site. Here it is reported once per request path, as a warning, with one fingerprint per `what`.
 * Every other error goes to Sentry unchanged.
 */
export function onRequestError(...args: RequestErrorArgs): void | Promise<void> {
  const [error, request] = args;
  const what = publicUnavailableWhat(error);
  if (!what) return Sentry.captureRequestError(...args);

  const now = Date.now();
  for (const [k, at] of seen) if (now - at > SEEN_MS) seen.delete(k);
  const key = `${request?.path ?? ""}`;
  if (seen.has(key)) return;
  seen.set(key, now);

  Sentry.withScope((scope) => {
    scope.setLevel("warning");
    scope.setFingerprint(["public-data-unavailable", what]);
    scope.setTag("public_data_unavailable", what);
    Sentry.captureRequestError(...args);
  });
}
