import axios from 'axios';

/** What went wrong with a request, for choosing the message and the next step (15.1). */
export type RequestErrorKind = 'timeout' | 'offline' | 'cancelled' | 'rate_limited' | 'server' | 'other';

export function requestErrorKind(error: unknown): RequestErrorKind {
  if (axios.isCancel(error)) return 'cancelled';
  const e = error as { code?: string; message?: string; response?: { status?: number }; request?: unknown } | null;
  const message = String(e?.message || '');
  if (message === 'REQUEST_ABORTED') return 'cancelled';
  if (message === 'REQUEST_TIMEOUT' || e?.code === 'ECONNABORTED' || e?.code === 'ETIMEDOUT') return 'timeout';
  const status = e?.response?.status;
  if (status === 429) return 'rate_limited';
  if (typeof status === 'number' && status >= 500) return 'server';
  if (!e?.response && (e?.code === 'ERR_NETWORK' || e?.request || /network error|failed to fetch|network request failed/i.test(message))) return 'offline';
  return 'other';
}

const TEXT: Record<'timeout' | 'offline' | 'rate_limited' | 'server', [string, string]> = {
  timeout: ['استغرق الطلب وقتًا طويلًا. تحقق من الاتصال ثم أعد المحاولة.', 'The request took too long. Check your connection and try again.'],
  offline: ['لا يوجد اتصال بالإنترنت. تحقق من الشبكة ثم أعد المحاولة.', 'No internet connection. Check your network and try again.'],
  rate_limited: ['محاولات كثيرة. انتظر قليلًا ثم أعد المحاولة.', 'Too many attempts. Wait a moment and try again.'],
  server: ['حدث خطأ في الخادم. أعد المحاولة بعد قليل، وإن استمر تواصل مع الدعم.', 'A server error occurred. Try again shortly; if it continues, contact support.'],
};

/** The sentence for a transport failure with its next step (retry, check the connection, contact support); null for any other error. */
export function requestErrorText(error: unknown, ar: boolean): string | null {
  const kind = requestErrorKind(error);
  if (kind === 'other' || kind === 'cancelled') return null;
  return TEXT[kind][ar ? 0 : 1];
}
