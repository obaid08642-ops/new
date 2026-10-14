import React from 'react';

import { RedirectKeepingParams } from '../../src/components/health/RedirectKeepingParams';

/** The reports list is the Reports tab of the records screen. */
export default function ReportsRedirect() {
  return <RedirectKeepingParams to="/health/records" params={{ tab: 'reports' }} />;
}
