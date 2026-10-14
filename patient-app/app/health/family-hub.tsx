import React from 'react';

import { RedirectKeepingParams } from '../../src/components/health/RedirectKeepingParams';

/** Old route (merge map, Batch 6, row A): the family hub is /family. */
export default function FamilyHubRedirect() {
  return <RedirectKeepingParams to="/family" />;
}
