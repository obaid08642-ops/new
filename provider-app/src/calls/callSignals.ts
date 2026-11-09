/**
 * "This ringing call is over": the caller hung up before an answer (push `call_missed` / `call_cancelled`), or the server says the
 * session is no longer ringing. The in-app incoming-call screen listens and dismisses itself; the native call screen is ended by the
 * same event.
 */
type Listener = (sessionId: string) => void;
const listeners = new Set<Listener>();

export function onRingingCallOver(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function emitRingingCallOver(sessionId: string): void {
  listeners.forEach((l) => l(sessionId));
}

/** What the server says about a session while it rings: still ringing only while INITIATED. */
export function isStillRinging(status: string | undefined | null): boolean {
  return !status || status === 'INITIATED';
}
