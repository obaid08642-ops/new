import { classifyOpen, type OpenOutcome, type ScanProbeResult } from "./scan-status";

/**
 * Asks the server about a stored file before the browser opens it (UPLOAD_SCAN=defer): a file that is still being scanned answers
 * 423 `file_pending_scan`, which is a normal state ("being checked for safety"), not an error. A redirect (the signed-URL routes
 * answer 302 to storage) is not followed here: `redirect: "manual"` gives an opaque redirect, which means the file can be opened.
 * The body of a good answer is never read.
 */
export async function probeFile(href: string, doFetch: typeof fetch = (...a) => fetch(...a)): Promise<ScanProbeResult> {
  const res = await doFetch(href, { redirect: "manual", cache: "no-store", credentials: "same-origin" });
  if (res.type === "opaqueredirect") return { status: 200 };
  let body: unknown = null;
  if (res.status === 423 || res.status === 400) body = await res.json().catch(() => null);
  else void res.body?.cancel().catch(() => undefined);
  return { status: res.status, body };
}

/** The outcome of one probe: pending, rejected, ok, or an ordinary error (the caller opens the link and lets the page answer as it always did). */
export async function outcomeOfProbe(href: string, doFetch?: typeof fetch): Promise<OpenOutcome> {
  try {
    const r = await probeFile(href, doFetch);
    return classifyOpen(r.status, r.body);
  } catch {
    return { state: "error" };
  }
}
