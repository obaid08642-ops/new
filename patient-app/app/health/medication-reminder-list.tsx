import React from 'react';

import { RedirectKeepingParams } from '../../src/components/health/RedirectKeepingParams';

/** The reminder list is the "All reminders" tab of the medications screen. */
export default function MedicationReminderListRedirect() {
  return <RedirectKeepingParams to="/health/medications" params={{ tab: 'reminders' }} />;
}
