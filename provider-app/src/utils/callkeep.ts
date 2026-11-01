import { Platform } from 'react-native';
import { apiFetch } from './api';
import { emitCallHold } from '../calls/callHold';
import { answerParams, endedAs, rememberRingingCall } from '../calls/callkeepLogic';
import { isBusyFor } from '../calls/activeCall';
import { emitRingingCallOver } from '../calls/callSignals';
import { openCallScreen } from '../calls/openCall';

/**
 * The system call screen (CallKit on iOS, ConnectionService on Android) through react-native-callkeep: it rings with the phone locked or
 * the app killed. Same behaviour as the patient app (patient-app/src/utils/callkeep.ts); Answer opens the call room for the session,
 * Decline tells the server. Without the native module (Expo Go, web) the call is shown by the in-app incoming-call screen or a
 * high-priority notification instead, so a call is never silent.
 */
let isCallKeepInitialized = false;
let RNCallKeep: any = null;

const getCallKeep = () => {
  if (!RNCallKeep && Platform.OS !== 'web') {
    try {
      const Constants = require('expo-constants').default;
      const { ExecutionEnvironment } = require('expo-constants');
      const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
      if (!isExpoGo) RNCallKeep = require('react-native-callkeep').default;
    } catch (e: any) {
      console.warn('[CallKeep] native module not loaded:', e?.message);
    }
  }
  return RNCallKeep;
};

const options = {
  ios: { appName: 'Nabd Provider', imageName: 'simIcon', supportsVideo: true, maximumCallGroups: '1', maximumCallsPerCallGroup: '1' },
  android: {
    alertTitle: 'Permissions required',
    alertDescription: 'This application needs to access your phone accounts',
    cancelButton: 'Cancel',
    okButton: 'ok',
    imageName: 'phone_talk',
    additionalPermissions: [],
    selfManaged: true,
    // keeps the process alive while the call rings and during the call, with the types Android 14 requires
    foregroundService: { channelId: 'com.nabd.provider.calls', channelName: 'Calls', notificationTitle: 'Nabd Provider', notificationIcon: 'phone_talk' },
  },
};

/** True on a build that has the native call module (not Expo Go, not web): only then does the app ring itself. */
export const canRingNatively = (): boolean => !!getCallKeep();

export const initCallKeep = async () => {
  if (Platform.OS === 'web' || isCallKeepInitialized) return;
  const callKeep = getCallKeep();
  if (!callKeep) return;
  try {
    await callKeep.setup(options);
    callKeep.setAvailable(true);
    isCallKeepInitialized = true;

    callKeep.addEventListener('answerCall', ({ callUUID }: { callUUID: string }) => {
      callKeep.backToForeground();
      // a voice call opens as voice (no camera), a video call as video
      openCallScreen('CallRoom', { ...answerParams(callUUID) });
    });
    // a phone call (or another app's call) takes the line: hold ours, resume when it ends
    callKeep.addEventListener('didToggleHoldCallAction', ({ hold }: { hold: boolean }) => emitCallHold(!!hold));
    callKeep.addEventListener('endCall', async ({ callUUID }: { callUUID: string }) => {
      // an answered call that ends is a hang-up (the call screen ends the session); only an unanswered one is a decline
      const how = endedAs(callUUID);
      emitRingingCallOver(callUUID);
      if (how === 'hangup') return;
      await apiFetch(`/calls/${encodeURIComponent(callUUID)}/reject`, { method: 'POST' }).catch(() => null);
    });
  } catch (e: any) {
    console.warn('[CallKeep] setup failed:', e?.message);
  }
};

/** A second call while one is running is answered "busy" and never rings. */
const declineBusy = (sessionId: string): boolean => {
  if (!isBusyFor(sessionId)) return false;
  void apiFetch(`/calls/${encodeURIComponent(sessionId)}/reject`, { method: 'POST' }).catch(() => null);
  return true;
};

/** App in the foreground: the system call screen when available, else the in-app incoming-call screen. */
export const displayNativeIncomingCall = async (sessionId: string, callerName: string, hasVideo = true) => {
  if (declineBusy(sessionId)) return;
  rememberRingingCall(sessionId, hasVideo);
  await initCallKeep();
  const callKeep = getCallKeep();
  if (isCallKeepInitialized && callKeep) {
    try { callKeep.displayIncomingCall(sessionId, callerName, callerName, 'number', hasVideo); return; } catch (e) { console.warn('[CallKeep] could not display the call:', e); }
  }
  openCallScreen('IncomingCall', { sessionId, callerName, mode: hasVideo ? 'video' : 'voice' });
};

/**
 * Rings from a background or headless context (no navigator): only the system call screen. Without the native module a visible
 * high-priority notification is shown, so a call push is never silent; tapping it opens the incoming-call screen.
 */
export const ringNativeCall = async (sessionId: string, callerName: string, hasVideo = true, body = ''): Promise<'native' | 'notification' | 'busy'> => {
  if (declineBusy(sessionId)) return 'busy';
  rememberRingingCall(sessionId, hasVideo);
  await initCallKeep();
  const callKeep = getCallKeep();
  if (isCallKeepInitialized && callKeep) {
    callKeep.displayIncomingCall(sessionId, callerName, callerName, 'generic', hasVideo);
    return 'native';
  }
  try {
    const Notifications = require('expo-notifications') as typeof import('expo-notifications'); // eslint-disable-line @typescript-eslint/no-require-imports
    await Notifications.scheduleNotificationAsync({
      content: {
        title: callerName,
        // the server's own (translated) text from the push; nothing is written here
        body,
        sound: 'default',
        priority: 'max',
        data: { type: 'call', session_id: sessionId, caller_name: callerName, call_type: hasVideo ? 'video' : 'voice' },
      },
      trigger: Platform.OS === 'android' ? ({ channelId: 'calls' } as never) : null,
    });
  } catch (e) {
    console.warn('[CallKeep] could not announce the call', e);
  }
  return 'notification';
};

export const endNativeCall = (sessionId: string) => {
  const callKeep = getCallKeep();
  if (isCallKeepInitialized && callKeep) {
    try { callKeep.endCall(sessionId); } catch { /* already ended */ }
  }
};
