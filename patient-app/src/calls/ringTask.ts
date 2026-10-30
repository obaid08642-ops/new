import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';
import { ringNativeCall, endNativeCall } from '../utils/callkeep';

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
  call_type?: string;
  callType?: string;
}

/** Pure part of the task: what to do with a pushed payload. */
export function ringAction(data: RingData | null | undefined): { kind: 'ring'; sessionId: string; caller: string; video: boolean } | { kind: 'end'; sessionId: string } | { kind: 'ignore' } {
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
  };
}

export async function handleRingPayload(data: RingData | null | undefined): Promise<void> {
  const action = ringAction(data);
  if (action.kind === 'ring') await ringNativeCall(action.sessionId, action.caller, action.video);
  else if (action.kind === 'end') endNativeCall(action.sessionId);
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

// Registered at module load, as the task manager requires (the file is imported from the root layout).
if (Platform.OS === 'android' && !TaskManager.isTaskDefined(CALL_RING_TASK)) {
  TaskManager.defineTask(CALL_RING_TASK, async ({ data }) => {
    await handleRingPayload(payloadData({ data }));
  });
}

export async function registerCallRingTask(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    await Notifications.registerTaskAsync(CALL_RING_TASK);
  } catch (e) {
    console.warn('[CallRing] could not register the background task', e);
  }
}
