import React from 'react';

import { RedirectKeepingParams } from '../../src/components/health/RedirectKeepingParams';

/** Old route (merge map 2, section 6): the approval wait is the request page; `requestId` and `bookingId` are kept. */
export default function ApprovalPendingRedirect() {
  return <RedirectKeepingParams to="/insurance/request" />;
}
