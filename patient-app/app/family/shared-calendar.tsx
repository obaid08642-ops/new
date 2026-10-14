import React from 'react';

import { RedirectKeepingParams } from '../../src/components/health/RedirectKeepingParams';

/** Old route (merge map, Batch 6, row C): one shared calendar. */
export default function SharedCalendarRedirect() {
  return <RedirectKeepingParams to="/family/calendar" />;
}
