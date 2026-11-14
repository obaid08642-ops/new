import { callPatientApi } from "./upstream";

/** GET /care/appointments/:id/outcomes: what a finished visit left the patient (reports, sick leave, referrals, the unseen count). */
export const getVisitOutcomes = (token: string, appointmentId: string): Promise<Response> =>
  callPatientApi(`/care/appointments/${encodeURIComponent(appointmentId)}/outcomes`, {}, token);

/** GET /care/appointments/outcomes/badge: the new outcomes across the patient's completed visits. */
export const getOutcomesBadge = (token: string): Promise<Response> => callPatientApi("/care/appointments/outcomes/badge", {}, token);
