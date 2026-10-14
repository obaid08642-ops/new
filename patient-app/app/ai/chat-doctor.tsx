import React from 'react';

import { RedirectKeepingParams } from '../../src/components/health/RedirectKeepingParams';

/** Old route (decision 24, Batch 9): the free doctor chat is gone; a doctor chat lives inside a booking, so this opens the bookings list. */
export default function AppAiChatDoctorRedirect() {
  return <RedirectKeepingParams to="/consultations/appointments" />;
}
