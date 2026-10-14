import React from 'react';

import { RedirectKeepingParams } from '../../src/components/health/RedirectKeepingParams';

/** Refills is a tab of the medications screen. */
export default function RefillsRedirect() {
  return <RedirectKeepingParams to="/health/medications" params={{ tab: 'refills' }} />;
}
