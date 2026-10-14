import React from 'react';

import { RedirectKeepingParams } from '../../src/components/health/RedirectKeepingParams';

/** Chronic medicines is a tab of the medications screen. */
export default function ChronicMedicationsRedirect() {
  return <RedirectKeepingParams to="/health/medications" params={{ tab: 'chronic' }} />;
}
