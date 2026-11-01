import { Platform } from 'react-native';
import { ringNativeCall, endNativeCall } from '../utils/callkeep';
import { emitRingingCallOver } from './callSignals';

/**
 * Rings an incoming call when the app is in the background or killed. The backend sends a call push as data-only,
 * high priority and short-lived to devices registered with `call_ring: true`; Android runs this task on arrival and shows
 * the system call screen (ConnectionService, full-screen intent). iOS rings from PushKit/CallKit (src/calls/voipPush.ts).
 * A `call_cancelled` / `call_missed` push for the same session ends the ringing screen.
 */
export const CALL_RING_TASK = 'nabd-call-ring';

export interface RingData {
  type?: string;
  session_id?: string;
  sessionId?: string;
  caller_name?: string;
  callerName?: string;
  title?: string;
  body?: string;
  call_type?: string;
  callType?: string;
}

/** Pure part of the task: what to do with a pushed payload. */
export function ringAction(data: RingData | null | undefined): { kind: 'ring'; sessionId: string; caller: string; video: boolean; body: string } | { kind: 'end'; sessionId: string } | { kind: 'ignore' } {
  if (!data) return { kind: 'ignore' };
  const sessionId = data.session_id || data.sessionId;
  if (!sessionId) return { kind: 'ignore' };
  if (data.type === 'call_cancelled' || data.type === 'call_missed' || data.type === 'call_ended') return { kind: 'end', sessionId };
  if (data.type !== 'call' && data.type !== 'incoming_call') return { kind: 'ignore' };
  return {
    kind: 'ring',
    sessionId,
    caller: data.caller_name || data.callerName || data.title || '',
    video: (data.call_type || data.callType) !== 'voice',
    body: data.body || '',
  };
}

export async function handleRingPayload(data: RingData | null | undefined): Promise<void> {
  const action = ringAction(data);
  if (action.kind === 'ring') await ringNativeCall(action.sessionId, action.caller, action.video, action.body);
  else if (action.kind === 'end') {
    endNativeCall(action.sessionId);
    emitRingingCallOver(action.sessionId);
  }
}

/** Notification payload as the task receives it: Android puts the data in `data.dataString` (JSON) or `data`. */
export function payloadData(task: unknown): RingData | null {
  const t = task as { data?: { dataString?: string; data?: RingData } & RingData } | undefined;
  const d = t?.data;
  if (!d) return null;
  if (typeof d.dataString === 'string') {
    try {
      return JSON.parse(d.dataString) as RingData;
    } catch {
      return null;
    }
  }
  return d.data ?? d;
}

// Both native modules are loaded lazily and guarded: importing expo-notifications / expo-task-manager at module scope throws in Expo Go
// and would stop the app from starting (the same reason src/utils/notifications.ts loads them on first use).
function nativeModules(): { Notifications: typeof import('expo-notifications'); TaskManager: typeof import('expo-task-manager') } | null {
  if (Platform.OS !== 'android') return null;
  try {
    return { Notifications: require('expo-notifications'), TaskManager: require('expo-task-manager') }; // eslint-disable-line @typescript-eslint/no-require-imports
  } catch {
    return null;
  }
}

// Registered at module load, as the task manager requires (the file is imported from the app root).
(() => {
  const m = nativeModules();
  if (!m) return;
  try {
    if (!m.TaskManager.isTaskDefined(CALL_RING_TASK)) {
      m.TaskManager.defineTask(CALL_RING_TASK, async ({ data }) => {
        await handleRingPayload(payloadData({ data }));
      });
    }
  } catch { /* the native task manager is not ready (Expo Go) */ }
})();

export async function registerCallRingTask(): Promise<void> {
  const m = nativeModules();
  if (!m) return;
  try {
    await m.Notifications.registerTaskAsync(CALL_RING_TASK);
  } catch (e) {
    console.warn('[CallRing] could not register the background task', e);
  }
}
