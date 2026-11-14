/**
 * Local media for the provider call room. Mic and camera are asked for ONE AT A TIME, so a refused camera does not take the
 * microphone with it (enableCameraAndMicrophone() fails both), and the wish of the user (muted, camera off) survives a reconnect.
 */
export type MediaProblem = 'mic_denied' | 'camera_denied' | 'mic_unavailable' | 'camera_unavailable';

export interface LocalMediaResult { mic: boolean; camera: boolean; problem?: MediaProblem }

interface LocalParticipantLike {
  setMicrophoneEnabled(on: boolean): Promise<unknown>;
  setCameraEnabled(on: boolean): Promise<unknown>;
}

/** A refused permission (the user said no or the OS blocks it) as opposed to a missing device or any other failure. */
export function isPermissionError(e: unknown): boolean {
  const x = e as { name?: string; message?: string } | null;
  return /NotAllowed|Permission|denied/i.test(`${x?.name || ''} ${x?.message || ''}`);
}

/**
 * Publish the tracks the user wants. A refused or missing camera leaves an audio-only call (`camera:false` with a problem);
 * a refused microphone is a failure the caller must act on (leave the room, show the permission message).
 */
export async function enableLocalMedia(p: LocalParticipantLike, want: { mic: boolean; camera: boolean }): Promise<LocalMediaResult> {
  let mic = false;
  let camera = false;
  let problem: MediaProblem | undefined;
  if (want.mic) {
    try { await p.setMicrophoneEnabled(true); mic = true; } catch (e) {
      return { mic: false, camera: false, problem: isPermissionError(e) ? 'mic_denied' : 'mic_unavailable' };
    }
  }
  if (want.camera) {
    try { await p.setCameraEnabled(true); camera = true; } catch (e) {
      problem = isPermissionError(e) ? 'camera_denied' : 'camera_unavailable';
    }
  }
  return { mic, camera, ...(problem ? { problem } : {}) };
}

/** What the screen says for a problem (Arabic or English; this app has no locale files). */
export function mediaProblemText(problem: MediaProblem, ar: boolean): string {
  switch (problem) {
    case 'mic_denied': return ar ? 'الميكروفون غير مسموح. فعّله من إعدادات الجهاز ثم أعد المحاولة.' : 'Microphone access is blocked. Allow it in the device settings, then retry.';
    case 'camera_denied': return ar ? 'الكاميرا غير مسموحة، تستمر المكالمة بالصوت فقط. فعّلها من إعدادات الجهاز.' : 'Camera access is blocked, so the call continues with audio only. Allow it in the device settings.';
    case 'mic_unavailable': return ar ? 'لا يوجد ميكروفون متاح على هذا الجهاز.' : 'No microphone is available on this device.';
    case 'camera_unavailable': return ar ? 'لا توجد كاميرا متاحة، تستمر المكالمة بالصوت فقط.' : 'No camera is available, so the call continues with audio only.';
  }
}
