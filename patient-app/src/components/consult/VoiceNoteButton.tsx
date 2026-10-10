import React, { useRef, useState } from 'react';
import { RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder } from 'expo-audio';

import { Button } from '../../../../packages/ui-native/src';
import { logError } from '../../utils/logger';
import { voiceNoteFile, type VoiceNoteFile } from '../../utils/voiceNote';

/**
 * Record and send a voice note (decision 24, items 388 / 799): the composer shows it only when the server's thread
 * permissions say `can_voice` (an online consultation). One tap starts the recording, the next stops it and hands the file
 * to the caller, which uploads it like any other chat attachment. Nothing is kept on the device after the hand-over.
 */
export function VoiceNoteButton({
  disabled,
  startLabel,
  stopLabel,
  onRecorded,
  onDenied,
  onError,
  theme,
  testID,
}: {
  disabled?: boolean;
  startLabel: string;
  stopLabel: string;
  onRecorded: (file: VoiceNoteFile) => void;
  onDenied: () => void;
  onError: () => void;
  theme: 'light' | 'dark';
  testID?: string;
}) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [recording, setRecording] = useState(false);
  const busy = useRef(false);

  const toggle = async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      if (!recording) {
        const permission = await requestRecordingPermissionsAsync();
        if (!permission.granted) {
          onDenied();
          return;
        }
        await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
        await recorder.prepareToRecordAsync();
        recorder.record();
        setRecording(true);
      } else {
        const seconds = recorder.currentTime;
        await recorder.stop();
        setRecording(false);
        await setAudioModeAsync({ allowsRecording: false });
        const file = voiceNoteFile(recorder.uri, seconds, Date.now());
        if (file) onRecorded(file);
        else onError();
      }
    } catch (error) {
      logError('consultations:chat:voice', error);
      setRecording(false);
      onError();
    } finally {
      busy.current = false;
    }
  };

  return (
    <Button
      label={recording ? stopLabel : startLabel}
      variant={recording ? 'danger' : 'outline'}
      size="sm"
      disabled={disabled && !recording}
      onPress={() => void toggle()}
      theme={theme}
      testID={testID}
    />
  );
}
