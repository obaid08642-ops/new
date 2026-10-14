import React from 'react';

import { RedirectKeepingParams } from '../../src/components/health/RedirectKeepingParams';

/** Old route (merge map 2, section 6): the benefits summary is the Benefits tab of the hub. */
export default function BenefitsSummaryRedirect() {
  return <RedirectKeepingParams to="/insurance" params={{ tab: 'benefits' }} />;
}
