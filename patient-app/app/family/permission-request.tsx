import React from 'react';

import { RedirectKeepingParams } from '../../src/components/health/RedirectKeepingParams';

/** Old route (merge map, Batch 6, row A): the pending permission requests are a section of the family hub. */
export default function PermissionRequestRedirect() {
  return <RedirectKeepingParams to="/family" />;
}
