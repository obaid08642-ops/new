import React from 'react';

import { RedirectKeepingParams } from '../../src/components/health/RedirectKeepingParams';

/** Old route (merge map, Batch 8): the nutrition profile form is the Target tab of the nutrition hub. */
export default function BodyTargetRedirect() {
  return <RedirectKeepingParams to="/nutrition/hub" params={{ tab: 'target' }} />;
}
