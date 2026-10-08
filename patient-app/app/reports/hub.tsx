import React from 'react';

import { RedirectKeepingParams } from '../../src/components/health/RedirectKeepingParams';

/** The reports hub is the Reports tab of the records screen (the health hub keeps the shortcut). */
export default function ReportsHubRedirect() {
  return <RedirectKeepingParams to="/health/records" params={{ tab: 'reports' }} />;
}
