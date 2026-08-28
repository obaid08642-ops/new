import React from 'react';
import { View, Text } from 'react-native';
import { VideoCallRoom } from './VideoCallRoom';

interface LiveKitRoomProviderProps {
  route: {
    params?: {
      appointmentId?: string;
      roomId?: string;
      peerName?: string;
      voiceOnly?: boolean;
    };
  };
  navigation: { goBack: () => void };
}

/**
 * Backwards-compatible navigation wrapper. The room identifier is treated as
 * the appointment identifier because the backend join endpoint authorizes the
 * caller against the appointment before issuing a LiveKit token.
 */
export const LiveKitRoomProvider = ({ route, navigation }: LiveKitRoomProviderProps) => {
  const params = route.params || {};
  const appointmentId = String(params.appointmentId || params.roomId || '');

  if (!appointmentId) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <Text style={{ textAlign: 'center' }}>Unable to start the call because its appointment identifier is missing.</Text>
      </View>
    );
  }

  return (
    <VideoCallRoom
      appointmentId={appointmentId}
      peerName={params.peerName}
      voiceOnly={params.voiceOnly}
      onEnd={() => navigation.goBack()}
    />
  );
};
