import React from 'react';

import { RedirectKeepingParams } from '../../src/components/health/RedirectKeepingParams';

/** Old route (merge map 2, section 6): the policy details are the Policy tab of the hub. */
export default function PolicyDetailRedirect() {
  return <RedirectKeepingParams to="/insurance" params={{ tab: 'policy' }} />;
}
