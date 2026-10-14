import React from 'react';

import { RedirectKeepingParams } from '../../src/components/health/RedirectKeepingParams';

/** The prescriptions list is the Prescriptions tab of the records screen. */
export default function PrescriptionsRedirect() {
  return <RedirectKeepingParams to="/health/records" params={{ tab: 'prescriptions' }} />;
}
