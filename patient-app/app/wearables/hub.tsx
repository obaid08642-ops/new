import React from 'react';

import { RedirectKeepingParams } from '../../src/components/health/RedirectKeepingParams';

/** Manual vitals entry (heart rate, blood pressure, glucose, weight, SpO2) is the "Add reading" sheet of the vitals screen. */
export default function WearablesHubRedirect() {
  return <RedirectKeepingParams to="/health/vitals" />;
}
