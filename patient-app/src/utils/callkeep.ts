import { Platform } from 'react-native';
import { router } from 'expo-router';
import { apiFetch } from './api';
import { emitCallHold } from '../calls/callHold';
import { answerParams, endedAs, rememberRingingCall } from '../calls/callkeepLogic';
import { isBusyFor } from '../calls/activeCall';
import { emitRingingCallOver } from '../calls/callSignals';

let isCallKeepInitialized = false;
let RNCallKeep: any = null;

const getCallKeep = () => {
  if (!RNCallKeep && Platform.OS !== 'web') {
    try {
      const Constants = require('expo-constants').default;
      const { ExecutionEnvironment } = require('expo-constants');
      const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
      if (!isExpoGo) {
        RNCallKeep = require('react-native-callkeep').default;
      }
    } catch (e: any) {
      console.warn('[CallKeep] Failed to load callkeep native module:', e.message);
    }
  }
  return RNCallKeep;
};

const options = {
  ios: {
    appName: 'Nabd',
    imageName: 'simIcon',
    supportsVideo: true,
    maximumCallGroups: '1',
    maximumCallsPerCallGroup: '1',
  },
  android: {
    alertTitle: 'Permissions required',
    alertDescription: 'This application needs to access your phone accounts',
    cancelButton: 'Cancel',
    okButton: 'ok',
    imageName: 'phone_talk',
    additionalPermissions: [],
    selfManaged: true,
    // keeps the process alive while the call rings and during the call, with the types Android 14 requires
    foregroundService: {
      channelId: 'com.patient.nabd.calls',
      channelName: 'Calls',
      notificationTitle: 'Nabd',
      notificationIcon: 'phone_talk',
    },
  },
};

/** True on a build that has the native call module (not Expo Go, not web): only then does the app ring itself. */
export const canRingNatively = (): boolean => !!getCallKeep();

export const initCallKeep = async () => {
  if (Platform.OS === 'web') return;
  if (isCallKeepInitialized) return;

  const callKeepInstance = getCallKeep();
  if (!callKeepInstance) {
    console.log('[CallKeep] CallKeep native module not available or running in Expo Go.');
    return;
  }

  try {
    await callKeepInstance.setup(options);
    callKeepInstance.setAvailable(true);
    isCallKeepInitialized = true;
    console.log('[CallKeep] Initialized successfully');

    // Register CallKeep listeners
    callKeepInstance.addEventListener('answerCall', async ({ callUUID }: { callUUID: string }) => {
      console.log('[CallKeep] Answer call event received:', callUUID);
      callKeepInstance.backToForeground();
      // a voice call opens as voice (no camera), a video call as video
      router.push({
        pathname: '/consultations/video-call' as any,
        params: answerParams(callUUID),
      });
    });

    // a phone call (or another app's call) takes the line: hold ours, resume when it ends
    callKeepInstance.addEventListener('didToggleHoldCallAction', ({ hold }: { hold: boolean }) => emitCallHold(!!hold));

    callKeepInstance.addEventListener('endCall', async ({ callUUID }: { callUUID: string }) => {
      console.log('[CallKeep] End/Reject call event received:', callUUID);
      // an answered call that ends is a hang-up (the call screen ends the session); only an unanswered one is a decline
      if (endedAs(callUUID) === 'hangup') {
        emitRingingCallOver(callUUID);
        return;
      }
      emitRingingCallOver(callUUID);
      try {
        await apiFetch(`/calls/${callUUID}/reject`, { method: 'POST' }).catch(() => null);
      } catch (err) {
        console.warn('CallKeep reject endpoint failed', err);
      }
    });

  } catch (e: any) {
    console.warn('[CallKeep] Setup failed (likely in Expo Go):', e.message);
  }
};

/** A second call while one is running is answered "busy" and never rings. */
const declineBusy = (sessionId: string): boolean => {
  if (!isBusyFor(sessionId)) return false;
  void apiFetch(`/calls/${sessionId}/reject`, { method: 'POST' }).catch(() => null);
  return true;
};

export const displayNativeIncomingCall = async (sessionId: string, callerName: string, hasVideo = true) => {
  if (declineBusy(sessionId)) return;
  rememberRingingCall(sessionId, hasVideo);
  await initCallKeep();
  
  const callKeepInstance = getCallKeep();
  if (!isCallKeepInitialized || !callKeepInstance) {
    console.log('[CallKeep] CallKeep not initialized, falling back to React Native overlay screen');
    router.push({
      pathname: '/consultations/incoming-call' as any,
      params: {
        sessionId,
        callerName,
        callType: hasVideo ? 'video' : 'voice',
      },
    });
    return;
  }

  try {
    callKeepInstance.displayIncomingCall(
      sessionId,
      callerName,
      callerName,
      'number',
      hasVideo
    );
  } catch (e) {
    console.warn('[CallKeep] Failed to display native call:', e);
    router.push({
      pathname: '/consultations/incoming-call' as any,
      params: {
        sessionId,
        callerName,
        callType: hasVideo ? 'video' : 'voice',
      },
    });
  }
};

/** Rings from a background/headless context: no router, only the system call screen. */
/**
 * Rings from a background/headless context: no router, only the system call screen. When the native call module is not available
 * (not initialised, or Expo Go) a visible high-priority notification is shown instead, so a call push is never silent; tapping it
 * opens the incoming-call screen. Returns how the call was announced.
 */
export const ringNativeCall = async (sessionId: string, callerName: string, hasVideo = true, body = ''): Promise<'native' | 'notification' | 'busy'> => {
  if (declineBusy(sessionId)) return 'busy';
  rememberRingingCall(sessionId, hasVideo);
  await initCallKeep();
  const callKeepInstance = getCallKeep();
  if (isCallKeepInitialized && callKeepInstance) {
    callKeepInstance.displayIncomingCall(sessionId, callerName, callerName, 'generic', hasVideo);
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
  const callKeepInstance = getCallKeep();
  if (isCallKeepInitialized && callKeepInstance) {
    try {
      callKeepInstance.endCall(sessionId);
    } catch {}
  }
};
export { RNCallKeep };
