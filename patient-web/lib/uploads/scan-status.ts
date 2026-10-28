/**
 * Upload scan state (UPLOAD_SCAN=defer). Pure logic, no React and no DOM; the same file is kept in patient-web, patient-app and
 * provider-app (a change goes to all three).
 *
 * The backend accepts a file it could not scan yet and answers `scan_status: 'pending_scan'`. Opening such a file answers HTTP 423
 * `file_pending_scan` with `retry_after_seconds` (60). After the scan a file that failed is `scan_status: 'infected'` (or the
 * server answers 4xx). A 423 is a normal state, never an error: it is shown as "being checked" and retried quietly.
 */

export type ScanState = 'ok' | 'pending' | 'rejected';

export type OpenOutcome =
  | { state: 'ok' }
  | { state: 'pending'; retryAfterSeconds: number }
  | { state: 'rejected' }
  | { state: 'error' };

export const DEFAULT_RETRY_SECONDS = 60;
const MIN_RETRY_SECONDS = 5;
const MAX_RETRY_SECONDS = 600;
/** A focus or visibility retry never fires twice within this window (no retry storm). */
export const FOCUS_THROTTLE_MS = 5000;

const record = (value: unknown): Record<string, unknown> | null => (value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null);

/** `scan_status` of an upload or file response, at the top level or under `data`. */
export function scanStatusOf(body: unknown): string | null {
  const top = record(body);
  if (!top) return null;
  if (typeof top.scan_status === 'string') return top.scan_status;
  const inner = record(top.data);
  return inner && typeof inner.scan_status === 'string' ? inner.scan_status : null;
}

/** The upload itself was refused because the scanner found something: 400 `file_infected` (code or message). */
export function isInfectedBody(body: unknown): boolean {
  const top = record(body);
  const inner = record(top?.data);
  return [top?.code, top?.message, inner?.code, inner?.message].some((v) => v === 'file_infected');
}

/** State of a file straight after its upload: 'pending_scan' and 'scanning' wait, 'infected' is rejected, anything else is usable. */
export function scanStateOfUpload(body: unknown): ScanState {
  if (isInfectedBody(body)) return 'rejected';
  const status = scanStatusOf(body);
  if (status === 'pending_scan' || status === 'scanning') return 'pending';
  if (status === 'infected') return 'rejected';
  return 'ok';
}

/** Seconds to wait before the next try: the server's `retry_after_seconds` (60 when missing), kept between 5 and 600. */
export function retryAfterSecondsOf(body: unknown): number {
  const top = record(body);
  const inner = record(top?.data);
  const raw = top?.retry_after_seconds ?? inner?.retry_after_seconds;
  const n = typeof raw === 'number' ? raw : typeof raw === 'string' ? Number(raw) : NaN;
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_RETRY_SECONDS;
  return Math.min(MAX_RETRY_SECONDS, Math.max(MIN_RETRY_SECONDS, Math.round(n)));
}

/**
 * Classifies the answer to opening a file. 423 is pending (never an error). An `infected` status is rejected. A 4xx (other than
 * 401, 408, 429) for a file that was waiting for its scan means the scan failed it: rejected. 2xx is ok. Anything else is an
 * ordinary error that the caller shows the way it always did.
 */
export function classifyOpen(status: number, body: unknown, wasPending = false): OpenOutcome {
  if (status === 423) return { state: 'pending', retryAfterSeconds: retryAfterSecondsOf(body) };
  const scan = scanStatusOf(body);
  if (scan === 'infected' || isInfectedBody(body)) return { state: 'rejected' };
  if (scan === 'pending_scan' || scan === 'scanning') return { state: 'pending', retryAfterSeconds: retryAfterSecondsOf(body) };
  if (status >= 200 && status < 300) return { state: 'ok' };
  if (wasPending && status >= 400 && status < 500 && status !== 401 && status !== 408 && status !== 429) return { state: 'rejected' };
  return { state: 'error' };
}

export interface ScanProbeResult { status: number; body?: unknown }

export interface ScanGateOptions {
  /** Asks the server about the file (opens it). Must resolve with the HTTP status; a rejection counts as a network error. */
  probe: () => Promise<ScanProbeResult>;
  onChange: (state: ScanState) => void;
  initial?: ScanState;
  now?: () => number;
  setTimer?: (fn: () => void, ms: number) => unknown;
  clearTimer?: (handle: unknown) => void;
}

export interface ScanGate {
  /** Probes now when the file is waiting (used for the first check and by `refresh`). */
  start: () => void;
  /** Focus or visibility came back: probe now, at most once per FOCUS_THROTTLE_MS. */
  refresh: () => void;
  /** Unmount: no more timers, no more probes, no more callbacks. */
  stop: () => void;
  state: () => ScanState;
}

/**
 * One file's scan gate. While the file is pending it probes every `retry_after_seconds` (one timer at a time, never overlapping)
 * and on `refresh`. A network error or an unexpected status keeps the state and tries again at the default interval: it is never
 * surfaced. It stops by itself on ok or rejected.
 */
export function createScanGate(options: ScanGateOptions): ScanGate {
  const now = options.now ?? Date.now;
  const setTimer = options.setTimer ?? ((fn, ms) => setTimeout(fn, ms));
  const clearTimer = options.clearTimer ?? ((handle) => clearTimeout(handle as ReturnType<typeof setTimeout>));
  let current: ScanState = options.initial ?? 'pending';
  let timer: unknown = null;
  let stopped = false;
  let inFlight = false;
  let lastProbe = -Infinity;

  const clear = () => { if (timer !== null) { clearTimer(timer); timer = null; } };
  const set = (next: ScanState) => { if (next !== current) { current = next; if (!stopped) options.onChange(next); } };
  const schedule = (seconds: number) => { clear(); if (!stopped && current === 'pending') timer = setTimer(() => { timer = null; void run(); }, seconds * 1000); };

  async function run(): Promise<void> {
    if (stopped || inFlight || current !== 'pending') return;
    inFlight = true;
    lastProbe = now();
    clear();
    let delay = DEFAULT_RETRY_SECONDS;
    try {
      const result = await options.probe();
      if (stopped) return;
      const outcome = classifyOpen(result.status, result.body, true);
      if (outcome.state === 'ok') set('ok');
      else if (outcome.state === 'rejected') set('rejected');
      else if (outcome.state === 'pending') delay = outcome.retryAfterSeconds;
    } catch {
      /* network error: keep waiting, quietly */
    } finally {
      inFlight = false;
    }
    schedule(delay);
  }

  return {
    start: () => { if (current === 'pending') void run(); },
    refresh: () => { if (current === 'pending' && now() - lastProbe >= FOCUS_THROTTLE_MS) void run(); },
    stop: () => { stopped = true; clear(); },
    state: () => current,
  };
}
