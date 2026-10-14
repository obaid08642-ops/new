import React from 'react';

import { RedirectKeepingParams } from '../../src/components/health/RedirectKeepingParams';

/** Old route (merge map 2, section 6): choosing the insurer is in the Policy tab of the insurance hub. */
export default function ProfileInsuranceRedirect() {
  return <RedirectKeepingParams to="/insurance" params={{ tab: 'policy' }} />;
}
