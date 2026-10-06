import React from 'react';

import { RedirectKeepingParams } from '../../src/components/health/RedirectKeepingParams';

/** The sleep score is the "last night" card of the sleep screen. */
export default function SleepScoreRedirect() {
  return <RedirectKeepingParams to="/health/sleep" />;
}
