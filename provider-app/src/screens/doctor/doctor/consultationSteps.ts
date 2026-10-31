/**
 * Which step the doctor can take on an appointment, from its server status and kind. Server lifecycle (appointments.service):
 * clinic and online: CONFIRMED -> CHECKED_IN -> IN_PROGRESS -> COMPLETED; home visit: CONFIRMED -> EN_ROUTE -> ARRIVED -> IN_PROGRESS -> COMPLETED
 * (the trip buttons are on the appointment screen; from ARRIVED the visit starts here, which used to be a dead end).
 */
export interface VisitSteps { ready: boolean; showCheckIn: boolean; showStart: boolean; canPrescribe: boolean; finished: boolean; isHomeVisit: boolean }

const OPEN_STATES = ['CONFIRMED', 'CHECKED_IN', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED'];

export function visitSteps(statusRaw: unknown, serviceTypeRaw: unknown): VisitSteps {
  const status = String(statusRaw || '').toUpperCase();
  const isHomeVisit = String(serviceTypeRaw || '').toLowerCase() === 'home';
  return {
    ready: OPEN_STATES.includes(status),
    // a home visit is not "checked in" at a clinic: the doctor travels and arrives
    showCheckIn: status === 'CONFIRMED' && !isHomeVisit,
    showStart: status === 'CHECKED_IN' || status === 'ARRIVED',
    // server rule (prescriptions.service create): a prescription needs an IN_PROGRESS appointment
    canPrescribe: status === 'IN_PROGRESS',
    finished: status === 'COMPLETED',
    isHomeVisit,
  };
}
