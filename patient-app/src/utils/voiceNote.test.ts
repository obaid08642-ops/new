import { composerRules } from '../components/consult/chatPermissions';
import { voiceNoteFile } from './voiceNote';

describe('voice notes in the doctor chat (388 / 799)', () => {
  it('builds the file the media store accepts and a whole-second length', () => {
    expect(voiceNoteFile('file:///cache/a.m4a', 4.6, 1700)).toEqual({ uri: 'file:///cache/a.m4a', name: 'voice-1700.m4a', mime: 'audio/m4a', durationSeconds: 5 });
    expect(voiceNoteFile('file:///cache/a.m4a', 0, 1)?.durationSeconds).toBe(1);
    expect(voiceNoteFile(null, 3, 1)).toBeNull();
    expect(voiceNoteFile('  ', 3, 1)).toBeNull();
  });

  it('offers the recorder only when the server says can_voice and the thread is open', () => {
    const base = { canChat: true, canCall: true, canUpload: true, online: true, status: 'active' as const, readOnly: false, emergencyLine: '997', followUp: null };
    expect(composerRules({ ...base, canVoice: true }, true).canVoice).toBe(true);
    expect(composerRules({ ...base, canVoice: false }, false).canVoice).toBe(false);
    expect(composerRules({ ...base, canVoice: true, readOnly: true }, true).canVoice).toBe(false);
    expect(composerRules(null, true).canVoice).toBe(false);
  });
});
