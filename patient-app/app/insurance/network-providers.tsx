import React from 'react';

import { RedirectKeepingParams } from '../../src/components/health/RedirectKeepingParams';

/** Old route (merge map 2, section 6): the network providers are the Network tab of the hub. */
export default function NetworkProvidersRedirect() {
  return <RedirectKeepingParams to="/insurance" params={{ tab: 'network' }} />;
}
