import { mapPermissions, consultationActions, threadErrorKey, remainingHoursLabel } from '../consultationThread';

const followUp = {
  status_code: 'follow_up', status_text_en: 'Follow-up Period', status_text_ar: 'فترة المتابعة',
  can_chat: true, can_upload: true, can_voice: false, can_call: false, online: false,
  remaining_hours: 40.2, window_ends_at: '2026-10-12T10:00:00.000Z', extended: false, emergency_line: '997',
};

describe('mapPermissions (decision 24)', () => {
  it('maps the follow-up window of a clinic visit: no voice', () => {
    const p = mapPermissions(followUp);
    expect(p).toMatchObject({ status: 'follow_up', canChat: true, canUpload: true, canVoice: false, readOnly: false, remainingHours: 40.2, emergencyLine: '997' });
  });
  it('treats closed / unknown / garbage as read-only with nothing enabled', () => {
    expect(mapPermissions({ status_code: 'closed', read_only: true }).readOnly).toBe(true);
    expect(mapPermissions({ status_code: 'weird', can_chat: true }).status).toBe('closed');
    expect(mapPermissions(null)).toMatchObject({ status: 'closed', canChat: false, readOnly: true, emergencyLine: '997' });
  });
  it('the active status has no remaining hours', () => {
    expect(mapPermissions({ status_code: 'active', can_chat: true }).remainingHours).toBeNull();
  });
});

describe('consultationActions', () => {
  it('offers close and extend in the follow-up window', () => {
    expect(consultationActions(mapPermissions(followUp), false)).toEqual({ canClose: true, canExtend: true });
  });
  it('hides extend once extended (server flag or just now)', () => {
    expect(consultationActions(mapPermissions({ ...followUp, extended: true }), false).canExtend).toBe(false);
    expect(consultationActions(mapPermissions(followUp), true).canExtend).toBe(false);
  });
  it('hides both when read-only', () => {
    expect(consultationActions(mapPermissions({ status_code: 'closed', read_only: true }), false)).toEqual({ canClose: false, canExtend: false });
  });
  it('active consultation: close only', () => {
    expect(consultationActions(mapPermissions({ status_code: 'active', can_chat: true }), false)).toEqual({ canClose: true, canExtend: false });
  });
});

describe('threadErrorKey', () => {
  const err = (status: number, message: unknown) => ({ response: { status, data: { message } } });
  it('maps the backend codes', () => {
    expect(threadErrorKey(err(400, 'thread_already_extended'))).toBe('already_extended');
    expect(threadErrorKey(err(400, 'extend_only_after_completion'))).toBe('extend_after_completion');
    expect(threadErrorKey(err(403, 'only_the_consultation_doctor'))).toBe('only_doctor');
    expect(threadErrorKey(err(403, undefined))).toBe('only_doctor');
    expect(threadErrorKey(err(500, 'x'))).toBe('other');
    expect(threadErrorKey(new Error('network'))).toBe('other');
  });
});

describe('remainingHoursLabel', () => {
  it('rounds up and localises', () => {
    expect(remainingHoursLabel(40.2, false)).toBe('41 h left');
    expect(remainingHoursLabel(0.2, true)).toBe('المتبقي 1 ساعة');
    expect(remainingHoursLabel(null, false)).toBe('');
  });
});
