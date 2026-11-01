import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, useLang } from '../../context';
import { NBtn } from '../../components/ui';
import { SP, FS, FW } from '../../constants';
import client from '../../api/client';
import { onRingingCallOver } from '../../calls/callSignals';
import { endNativeCall } from '../../utils/callkeep';

interface Props {
  route: { params?: { sessionId?: string; callerName?: string; mode?: 'voice' | 'video' } };
  navigation: { goBack: () => void; replace: (name: string, params: Record<string, unknown>) => void };
}

/**
 * The in-app incoming call: shown when the system call screen is not available (a build without the native call module) or when a call
 * notification is tapped. Answer joins the session in the call room; Decline tells the server. It closes itself when the caller hangs up.
 */
export function IncomingCallScreen({ route, navigation }: Props) {
  const { theme } = useTheme();
  const { t } = useLang();
  const insets = useSafeAreaInsets();
  const { sessionId = '', callerName = '', mode = 'video' } = route.params || {};
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => onRingingCallOver((id) => { if (id === sessionId) navigation.goBack(); }), [sessionId, navigation]);

  const accept = () => {
    endNativeCall(sessionId); // the system call screen, if one is also showing, is dismissed
    navigation.replace('CallRoom', { sessionId, mode });
  };
  const decline = async () => {
    setBusy(true);
    try {
      await client.post(`/calls/${encodeURIComponent(sessionId)}/reject`);
      endNativeCall(sessionId);
      navigation.goBack();
    } catch (e) {
      setError((e as { response?: { data?: { message?: string } } })?.response?.data?.message || t('incomingCall.declineFailed'));
      setBusy(false);
    }
  };

  if (!sessionId) return null;
  return (
    <View style={{ flex: 1, backgroundColor: theme.bg, justifyContent: 'center', alignItems: 'center', padding: SP.xl, paddingTop: SP.xl + insets.top, paddingBottom: SP.xl + insets.bottom, gap: SP.lg }}>
      <Text accessibilityLiveRegion="polite" style={{ color: theme.textSub, fontSize: FS.md }}>{mode === 'voice' ? t('incomingCall.voice') : t('incomingCall.video')}</Text>
      <Text style={{ color: theme.text, fontSize: FS.xl, fontWeight: FW.bold, textAlign: 'center' }}>{callerName || t('incomingCall.patient')}</Text>
      {error ? <Text style={{ color: theme.warn }}>{error}</Text> : null}
      <View style={{ flexDirection: 'row', gap: SP.md, alignSelf: 'stretch' }}>
        <View style={{ flex: 1 }}><NBtn label={t('incomingCall.decline')} variant="danger" disabled={busy} onPress={decline} /></View>
        <View style={{ flex: 1 }}><NBtn label={t('incomingCall.answer')} disabled={busy} onPress={accept} /></View>
      </View>
    </View>
  );
}

/** The call room for an answered call: joins the session that rang. */
export function CallRoomScreen({ route, navigation }: Props) {
  const { VideoCallRoom } = require('./VideoCallRoom'); // eslint-disable-line @typescript-eslint/no-require-imports
  const { sessionId = '', mode = 'video' } = route.params || {};
  return <VideoCallRoom sessionId={sessionId} voiceOnly={mode === 'voice'} onEnd={() => navigation.goBack()} />;
}
