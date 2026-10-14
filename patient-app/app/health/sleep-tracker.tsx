import React from 'react';

import { RedirectKeepingParams } from '../../src/components/health/RedirectKeepingParams';

/** The sleep tracker is the log and the "Add sleep" sheet of the sleep screen. */
export default function SleepTrackerRedirect() {
  return <RedirectKeepingParams to="/health/sleep" />;
}
