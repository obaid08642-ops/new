const { enableLocalMedia, isPermissionError, mediaProblemText } = require('./callMedia');

const ok = () => Promise.resolve();
const denied = () => Promise.reject(Object.assign(new Error('Permission denied'), { name: 'NotAllowedError' }));
const missing = () => Promise.reject(Object.assign(new Error('Requested device not found'), { name: 'NotFoundError' }));

describe('provider call room: local media', () => {
  it('publishes mic and camera when both are allowed', async () => {
    expect(await enableLocalMedia({ setMicrophoneEnabled: ok, setCameraEnabled: ok }, { mic: true, camera: true })).toEqual({ mic: true, camera: true });
  });

  it('a refused camera keeps the microphone: the call goes on with audio only and says why', async () => {
    const r = await enableLocalMedia({ setMicrophoneEnabled: ok, setCameraEnabled: denied }, { mic: true, camera: true });
    expect(r).toEqual({ mic: true, camera: false, problem: 'camera_denied' });
  });

  it('a missing camera is not reported as a permission problem', async () => {
    const r = await enableLocalMedia({ setMicrophoneEnabled: ok, setCameraEnabled: missing }, { mic: true, camera: true });
    expect(r.problem).toBe('camera_unavailable');
  });

  it('a refused microphone fails the call and never tries the camera', async () => {
    const cam = jest.fn(ok);
    const r = await enableLocalMedia({ setMicrophoneEnabled: denied, setCameraEnabled: cam }, { mic: true, camera: true });
    expect(r).toEqual({ mic: false, camera: false, problem: 'mic_denied' });
    expect(cam).not.toHaveBeenCalled();
  });

  it('a reconnect keeps what the user chose: muted and camera off stay off', async () => {
    const mic = jest.fn(ok); const cam = jest.fn(ok);
    const r = await enableLocalMedia({ setMicrophoneEnabled: mic, setCameraEnabled: cam }, { mic: false, camera: false });
    expect(mic).not.toHaveBeenCalled(); expect(cam).not.toHaveBeenCalled();
    expect(r).toEqual({ mic: false, camera: false });
  });

  it('classifies errors and words every problem in both languages', () => {
    expect(isPermissionError({ name: 'NotAllowedError' })).toBe(true);
    expect(isPermissionError(new Error('Permission denied by system'))).toBe(true);
    expect(isPermissionError({ name: 'NotFoundError', message: 'no device' })).toBe(false);
    for (const p of ['mic_denied', 'camera_denied', 'mic_unavailable', 'camera_unavailable']) {
      expect(mediaProblemText(p, true)).toMatch(/[؀-ۿ]/);
      expect(mediaProblemText(p, false)).toMatch(/^[A-Za-z]/);
    }
  });
});
