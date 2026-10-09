import React from 'react';

import { RedirectKeepingParams } from '../../src/components/health/RedirectKeepingParams';

/** Old route (merge map, Batch 6, row F): Scan QR is a tab of /family/add. */
export default function FamilyScanRedirect() {
  return <RedirectKeepingParams to="/family/add" params={{ tab: 'scan' }} />;
}
