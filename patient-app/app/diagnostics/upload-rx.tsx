import React from 'react';

import { RedirectKeepQuery } from '../../src/components/RedirectKeepQuery';

/**
 * Legacy route (journeys#59): a lab request from the doctor is booked as lab tests, not as medicines, so it opens the lab
 * test search (the doctor's request is attached to the booking from the order). It used to open the pharmacy prescription
 * scan, which then offered to order medicines. Deep links keep their query.
 */
export default function DiagnosticsUploadRxRedirect() {
  return <RedirectKeepQuery to="/diagnostics/search" />;
}
