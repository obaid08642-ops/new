import { visitSteps } from '../consultationSteps';

describe('what the doctor can do at each status', () => {
  it('clinic / online: check in, then start, then prescribe, then finish', () => {
    expect(visitSteps('CONFIRMED', 'clinic')).toMatchObject({ ready: true, showCheckIn: true, showStart: false });
    expect(visitSteps('CHECKED_IN', 'online')).toMatchObject({ showCheckIn: false, showStart: true });
    expect(visitSteps('IN_PROGRESS', 'clinic')).toMatchObject({ canPrescribe: true, showStart: false });
    expect(visitSteps('COMPLETED', 'clinic')).toMatchObject({ finished: true, canPrescribe: false });
  });

  it('home visit: no clinic check-in; from ARRIVED the doctor can start (it used to be "session not ready")', () => {
    expect(visitSteps('CONFIRMED', 'home')).toMatchObject({ ready: true, showCheckIn: false, isHomeVisit: true });
    expect(visitSteps('EN_ROUTE', 'home')).toMatchObject({ ready: true, showStart: false });
    expect(visitSteps('ARRIVED', 'home')).toMatchObject({ ready: true, showStart: true });
    expect(visitSteps('IN_PROGRESS', 'home')).toMatchObject({ canPrescribe: true });
  });

  it('a pending, cancelled or unknown appointment is not ready', () => {
    for (const s of ['PENDING', 'CANCELLED', 'NO_SHOW', '', undefined]) expect(visitSteps(s, 'clinic').ready).toBe(false);
  });

  it('is not case sensitive about the status', () => {
    expect(visitSteps('arrived', 'HOME')).toMatchObject({ ready: true, showStart: true, isHomeVisit: true });
  });
});
