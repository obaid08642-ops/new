/**
 * What the native call screen (CallKit / ConnectionService) needs to remember about a ringing call, as plain functions:
 * whether it is a voice or a video call (the answer must open the right screen), and whether it was answered (ending an answered call
 * is a hang-up handled by the call screen, not a "decline").
 */
export interface CallMeta {
  video: boolean;
}

const meta = new Map<string, CallMeta>();
const answered = new Set<string>();

export function rememberRingingCall(sessionId: string, video: boolean): void {
  meta.set(sessionId, { video });
}

/** The route params for the screen that joins the call the user just answered. */
export function answerParams(sessionId: string): { sessionId: string; mode: 'voice' | 'video' } {
  answered.add(sessionId);
  return { sessionId, mode: meta.get(sessionId)?.video === false ? 'voice' : 'video' };
}

/** The native screen reported the call ended: 'decline' only if it was never answered. */
export function endedAs(sessionId: string): 'decline' | 'hangup' {
  const wasAnswered = answered.delete(sessionId);
  meta.delete(sessionId);
  return wasAnswered ? 'hangup' : 'decline';
}

export function resetCallkeepLogicForTests(): void {
  meta.clear();
  answered.clear();
}
