import React from 'react';

import { RedirectKeepingParams } from '../../src/components/health/RedirectKeepingParams';

/** Old route (merge map 2, section 6): the insurance hub is /insurance; `?tab=` is kept. */
export default function InsuranceHubRedirect() {
  return <RedirectKeepingParams to="/insurance" />;
}
