import { Platform } from 'react-native';
import { router } from 'expo-router';
import { apiFetch } from './api';

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
  },
};

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
      router.push({
        pathname: '/consultations/video-call' as any,
        params: { sessionId: callUUID },
      });
    });

    callKeepInstance.addEventListener('endCall', async ({ callUUID }: { callUUID: string }) => {
      console.log('[CallKeep] End/Reject call event received:', callUUID);
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

export const displayNativeIncomingCall = async (sessionId: string, callerName: string, hasVideo = true) => {
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

export const endNativeCall = (sessionId: string) => {
  const callKeepInstance = getCallKeep();
  if (isCallKeepInitialized && callKeepInstance) {
    try {
      callKeepInstance.endCall(sessionId);
    } catch {}
  }
};
export { RNCallKeep };
