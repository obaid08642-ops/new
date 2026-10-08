import React from 'react';

import { RedirectKeepingParams } from '../../src/components/health/RedirectKeepingParams';

/** This legacy route is the "All reminders" tab of the medications screen. */
export default function RemindersRedirect() {
  return <RedirectKeepingParams to="/health/medications" params={{ tab: 'reminders' }} />;
}
