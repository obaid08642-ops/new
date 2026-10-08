import React from 'react';

import { RedirectKeepingParams } from '../../src/components/health/RedirectKeepingParams';

/** The trends page is the Trends tab of the vitals screen. */
export default function TrendsRedirect() {
  return <RedirectKeepingParams to="/health/vitals" params={{ tab: 'trends' }} />;
}
