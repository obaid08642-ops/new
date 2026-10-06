import React, { useEffect, useState } from 'react';
import { StatusBar, Vibration, View } from 'react-native';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ErrorState } from '../../../packages/ui-native/src';
import { CallButton, CallIdentity, useCallUi } from '../../src/components/consult/CallKit';
import { apiFetch } from '../../src/utils/api';
import { logError } from '../../src/utils/logger';

/**
 * Incoming call — no board (owner decision, 2026-10-04): the layout stays (who is calling, decline and accept), drawn with
 * the dark tokens, the font and labelled buttons. The ringing, the vibration, the 35-second timeout, POST
 * /calls/:sessionId/reject and the move to the video call on accept are exactly what they were.
 */

export default function IncomingCallScreen() {
  const insets = useSafeAreaInsets();
  const { c, k } = useCallUi();
  const params = useLocalSearchParams();

  const callerName = (params.callerName as string) || k('consult.call.incoming');
  const sessionId = params.sessionId as string;
  const callType = (params.callType as 'voice' | 'video') || 'video';

  const [, setRingTime] = useState(0);
  const [failed, setFailed] = useState(false);

  // Vibrate / ring simulator
  useEffect(() => {
    // Vibrate pattern: wait 1s, vibrate 1.5s, wait 1s
    const pattern = [1000, 1500, 1000];
    Vibration.vibrate(pattern, true);

    const t = setInterval(() => {
      setRingTime((p) => {
        if (p >= 35) {
          // Timeout call after 35 seconds of ringing
          void handleReject();
          return p;
        }
        return p + 1;
      });
    }, 1000);

    return () => {
      Vibration.cancel();
      clearInterval(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const handleAccept = () => {
    Vibration.cancel();
    router.replace({ pathname: '/consultations/video-call', params: { sessionId, mode: callType } } as unknown as Href);
  };

  const handleReject = async () => {
    Vibration.cancel();
    if (sessionId) {
      try {
        await apiFetch(`/calls/${sessionId}/reject`, { method: 'POST' });
      } catch (err) {
        logError('consultations:incoming-call:reject', err);
        setFailed(true);
      }
    }
    router.back();
  };

  if (failed) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg.canvas, justifyContent: 'center', padding: 24 }}>
        <ErrorState title={k('consult.call.rejectFailed')} body={k('consult.call.startFailedBody')} retryLabel={k('consult.retry')} onRetry={() => setFailed(false)} theme="dark" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, justifyContent: 'space-between', alignItems: 'center', backgroundColor: c.bg.canvas }} testID="incoming-call-screen">
      <StatusBar barStyle="light-content" />

      {/* Top Section */}
      <View style={{ alignItems: 'center', width: '100%', paddingTop: insets.top + 60 }}>
        <CallIdentity name={callerName} line={k(callType === 'video' ? 'consult.call.incomingVideo' : 'consult.call.incomingVoice')} />
      </View>

      {/* Bottom Controls */}
      <View style={{ width: '100%', alignItems: 'center', paddingBottom: insets.bottom + 60 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 16, paddingHorizontal: 16 }}>
          <CallButton label={k('consult.call.decline')} tone="danger" onPress={() => void handleReject()} testID="call-decline" />
          <CallButton label={k('consult.call.accept')} tone="accept" onPress={handleAccept} testID="call-accept" />
        </View>
      </View>
    </View>
  );
}
