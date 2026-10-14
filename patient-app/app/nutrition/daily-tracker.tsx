import React from 'react';

import { RedirectKeepingParams } from '../../src/components/health/RedirectKeepingParams';

/** Old route (merge map, Batch 8): the day's meals, water and summary are the Today tab of the nutrition hub. */
export default function DailyTrackerRedirect() {
  return <RedirectKeepingParams to="/nutrition/hub" params={{ tab: 'today' }} />;
}
