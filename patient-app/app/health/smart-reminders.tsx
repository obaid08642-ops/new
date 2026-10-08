import React from 'react';

import { RedirectKeepingParams } from '../../src/components/health/RedirectKeepingParams';

/** The smart reminders are the "All reminders" tab of the medications screen. */
export default function SmartRemindersRedirect() {
  return <RedirectKeepingParams to="/health/medications" params={{ tab: 'reminders' }} />;
}
