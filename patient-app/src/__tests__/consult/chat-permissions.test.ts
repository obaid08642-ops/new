import { router } from 'expo-router';

import { composerRules, followUpTarget, parseThreadPermissions, windowBanner } from '../../components/consult/chatPermissions';
import { openFollowUp } from '../../components/consult/AppointmentSections';
import { message } from '../../components/screen/ScreenKit';

/** Decision 24: the thread rules come from GET /chat/threads/:id/permissions. Every value here is a TEST value. */

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) },
}));
jest.mock('react-native-localize', () => ({ getLocales: () => [], findBestLanguageTag: () => undefined }));
jest.mock('../../context/AppContext', () => ({ useApp: () => ({ isDark: false, lang: 'en', isRTL: false }) }));

const base = { can_chat: true, can_call: false, can_upload: true, can_voice: true, online: true, status_code: 'follow_up' };

describe('thread permissions mapping', () => {
  it('maps the server answer, bare or wrapped in data', () => {
    expect(parseThreadPermissions({ data: { ...base, remaining_hours: 3.4, emergency_line: '997' } })).toMatchObject({ canChat: true, canCall: false, canUpload: true, canVoice: true, status: 'follow_up', readOnly: false, emergencyLine: '997' });
  });

  it('is null for anything that is not a permissions answer', () => {
    expect(parseThreadPermissions(null)).toBeNull();
    expect(parseThreadPermissions({ ...base, status_code: 'weird' })).toBeNull();
  });

  it('a missing flag is not allowed and a non-numeric emergency line falls back to 997', () => {
    expect(parseThreadPermissions({ can_chat: true, status_code: 'active', emergency_line: 'x:1' })).toMatchObject({ canVoice: false, canCall: false, emergencyLine: '997' });
  });

  it('composer follows the server: follow-up window has no call; read-only closes everything; no answer keeps the booking rule', () => {
    expect(composerRules(parseThreadPermissions(base), true)).toEqual({ canType: true, canAttach: true, canCall: false, canVoice: true, readOnly: false });
    const closed = parseThreadPermissions({ ...base, can_chat: false, can_upload: false, can_voice: false, status_code: 'closed', read_only: true });
    expect(composerRules(closed, true)).toEqual({ canType: false, canAttach: false, canCall: false, canVoice: false, readOnly: true });
    const upcoming = parseThreadPermissions({ ...base, can_chat: false, can_upload: false, can_voice: false, status_code: 'upcoming' });
    expect(composerRules(upcoming, true)).toMatchObject({ canType: false, canAttach: false, readOnly: false });
    expect(composerRules(null, true)).toMatchObject({ canType: true, canCall: true, canVoice: false });
    expect(composerRules(null, false).canCall).toBe(false);
  });

  it('banner: state and time left, and every language has the keys it uses', () => {
    expect(windowBanner(parseThreadPermissions({ ...base, remaining_hours: 5.4 }))).toEqual({ statusKey: 'consult.chat.window.follow_up', remaining: { key: 'consult.chat.window.hoursLeft', count: 5 } });
    expect(windowBanner(parseThreadPermissions({ ...base, remaining_hours: 0.5 }))?.remaining).toEqual({ key: 'consult.chat.window.minutesLeft', count: 30 });
    expect(windowBanner(parseThreadPermissions({ ...base, status_code: 'active' }))).toEqual({ statusKey: 'consult.chat.window.active' });
    for (const lang of ['ar', 'en', 'ur', 'hi', 'bn', 'fil']) {
      for (const key of ['upcoming', 'active', 'follow_up', 'closed', 'hoursLeft', 'minutesLeft']) expect(message(lang, `consult.chat.window.${key}`, { count: 5 })).not.toContain('consult.chat.window');
    }
  });
});

describe('follow-up navigation', () => {
  const closed = parseThreadPermissions({ ...base, status_code: 'closed', read_only: true, book_follow_up: { action: 'book_follow_up', doctor_id: 'd1', doctor_user_id: 'u1', specialty: 'cardiology' } });

  it('targets the server doctor_id, then the route id, then the account id; nothing without an appointment', () => {
    expect(followUpTarget(closed, 'route', 'appt')).toEqual({ doctorId: 'd1', appointmentId: 'appt' });
    const noDoctor = parseThreadPermissions({ ...base, status_code: 'closed', read_only: true, book_follow_up: { action: 'book_follow_up', doctor_id: null, doctor_user_id: 'u1' } });
    expect(followUpTarget(noDoctor, 'route', 'appt')?.doctorId).toBe('route');
    expect(followUpTarget(noDoctor, '', 'appt')?.doctorId).toBe('u1');
    expect(followUpTarget(closed, 'route', '')).toBeNull();
  });

  it('opens the existing booking with the doctor preselected, ids only in the params', () => {
    const target = followUpTarget(closed, '', 'appt-7');
    openFollowUp(target!.doctorId, target!.appointmentId);
    expect(router.push).toHaveBeenCalledWith({ pathname: '/consultations/book/[id]', params: { id: 'd1', followUp: 'appt-7' } });
  });
});
