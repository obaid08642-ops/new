/**
 * A recorded voice note as the chat sends it (items 388 / 799): an .m4a file (the extension the media store accepts) and the
 * length in whole seconds (`duration_seconds` of the chat message). Nothing here reads or invents the recording itself.
 */
export interface VoiceNoteFile {
  uri: string;
  name: string;
  mime: string;
  durationSeconds: number;
}

/** null when the recorder gave no file (the caller shows the usual attach error). */
export function voiceNoteFile(uri: string | null | undefined, seconds: number, now: number): VoiceNoteFile | null {
  if (typeof uri !== 'string' || uri.trim() === '') return null;
  const whole = Number.isFinite(seconds) ? Math.max(1, Math.round(seconds)) : 1;
  return { uri, name: `voice-${now}.m4a`, mime: 'audio/m4a', durationSeconds: whole };
}
