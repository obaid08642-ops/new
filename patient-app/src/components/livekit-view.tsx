import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../../src/components/Icon';
import { AppText } from '../../src/components/ui';
import {
  LiveKitRoom,
  useRoomContext,
  useParticipant,
  VideoView,
  AudioSession,
} from '@livekit/react-native';
import { Room, Participant, Track } from 'livekit-client';

interface LiveKitCallViewProps {
  room: Room;
  livekitUrl: string;
  token: string;
  isVoiceOnly: boolean;
  handleEndCall: () => void;
  st: any;
  ControlBtn: React.ComponentType<{
    icon: string;
    label: string;
    active: boolean;
    onPress: () => void;
  }>;
}

function RemoteVideoView({ participant, st }: { participant: Participant; st: any }) {
  const { cameraPublication } = useParticipant(participant);
  
  if (cameraPublication && cameraPublication.isSubscribed && !cameraPublication.isMuted) {
    return <VideoView videoTrack={cameraPublication.videoTrack} style={st.remoteVideo} />;
  }

  return (
    <View style={st.videoPlaceholder}>
      <View style={st.doctorAvatar}>
        <Icon name="doctor" size={64} color="rgba(255,255,255,0.6)" />
      </View>
      <AppText variant="h4" color="#fff">{participant.identity}</AppText>
      <AppText variant="bodySM" color="rgba(255,255,255,0.6)">الكاميرا مغلقة لدى الطبيب</AppText>
    </View>
  );
}

function ActiveCall({
  isVoiceOnly,
  onEndCall,
  st,
  ControlBtn,
}: {
  isVoiceOnly: boolean;
  onEndCall: () => void;
  st: any;
  ControlBtn: any;
}) {
  const room = useRoomContext();
  const insets = useSafeAreaInsets();
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(isVoiceOnly);
  const [isSpeaker, setIsSpeaker] = useState(false);

  // Find the doctor/remote participant
  const remoteParticipants = Array.from(room.remoteParticipants.values());
  const remoteParticipant = remoteParticipants[0];

  useEffect(() => {
    const t = setInterval(() => setCallDuration(p => p + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const formatTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const toggleMic = () => {
    const enabled = !isMuted;
    setIsMuted(enabled);
    room.localParticipant.setMicrophoneEnabled(!enabled);
  };

  const toggleCamera = () => {
    if (isVoiceOnly) return;
    const off = !isCameraOff;
    setIsCameraOff(off);
    room.localParticipant.setCameraEnabled(!off);
  };

  const toggleSpeaker = async () => {
    const nextSpeaker = !isSpeaker;
    setIsSpeaker(nextSpeaker);
    try {
      await AudioSession.configureAudio({
        ios: { defaultOutput: nextSpeaker ? 'speaker' : 'earpiece' },
      });
    } catch (e) {
      console.warn('Failed to route audio', e);
    }
  };

  return (
    <View style={st.activeContainer}>
      {!isVoiceOnly && remoteParticipant ? (
        <RemoteVideoView participant={remoteParticipant} st={st} />
      ) : (
        <View style={st.doctorArea}>
          <View style={st.doctorAvatar}>
            <Icon name="doctor" size={64} color="rgba(255,255,255,0.6)" />
          </View>
          <AppText variant="h4" color="#fff">
            {remoteParticipant?.identity || 'د. محمد أحمد الكردي'}
          </AppText>
          <AppText variant="bodySM" color="rgba(255,255,255,0.6)">
            {remoteParticipants.length === 0 ? 'في انتظار انضمام الطبيب...' : 'مكالمة نشطة'}
          </AppText>
        </View>
      )}

      {!isVoiceOnly && !isCameraOff && (
        <View style={[st.selfView, { top: insets.top + 16 }]}>
          <VideoView
            videoTrack={room.localParticipant.getTrackPublication(Track.Source.Camera)?.videoTrack}
            style={st.selfVideo}
            zOrder={1}
          />
        </View>
      )}

      <View style={[st.callInfo, { top: insets.top + 16 }]}>
        <View style={st.callBadge}>
          <View style={st.liveDot} />
          <AppText variant="labelMD" color="#fff">
            {formatTime(callDuration)}
          </AppText>
        </View>
      </View>

      <View style={[st.controls, { paddingBottom: insets.bottom + 20 }]}>
        <View style={st.controlsRow}>
          <ControlBtn
            icon={isMuted ? 'micOff' : 'mic'}
            label={isMuted ? 'تفعيل الصوت' : 'كتم'}
            active={isMuted}
            onPress={toggleMic}
          />
          {!isVoiceOnly && (
            <ControlBtn
              icon={isCameraOff ? 'cameraOff' : 'camera'}
              label={isCameraOff ? 'تشغيل الكاميرا' : 'إيقاف الكاميرا'}
              active={isCameraOff}
              onPress={toggleCamera}
            />
          )}
          <ControlBtn
            icon={isSpeaker ? 'mic' : 'mic'}
            label={isSpeaker ? 'سماعة الهاتف' : 'مكبر الصوت'}
            active={isSpeaker}
            onPress={toggleSpeaker}
          />
        </View>
        <TouchableOpacity onPress={onEndCall} style={st.endBtn}>
          <Icon name="call" size={30} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function LiveKitCallView({
  room,
  livekitUrl,
  token,
  isVoiceOnly,
  handleEndCall,
  st,
  ControlBtn,
}: LiveKitCallViewProps) {
  return (
    <LiveKitRoom
      room={room}
      serverUrl={livekitUrl.replace('ws://', 'http://').replace('wss://', 'https://')}
      token={token}
      connect={true}
      audio={true}
      video={!isVoiceOnly}
    >
      <ActiveCall
        isVoiceOnly={isVoiceOnly}
        onEndCall={handleEndCall}
        st={st}
        ControlBtn={ControlBtn}
      />
    </LiveKitRoom>
  );
}
