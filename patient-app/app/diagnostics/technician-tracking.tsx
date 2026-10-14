import React from 'react';

import { RedirectKeepQuery } from '../../src/components/RedirectKeepQuery';

/** Merged into diagnostics/sample-tracking (second pass, section 2): both read GET /labs/bookings/:id and /tracking. Deep links keep their query. */
export default function TechnicianTrackingRedirect() {
  return <RedirectKeepQuery to="/diagnostics/sample-tracking" />;
}
