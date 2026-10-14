import React from 'react';

import { RedirectKeepingParams } from '../../src/components/health/RedirectKeepingParams';

/** Old route (merge map, Batch 6, row F): Join with a code is a tab of /family/add (a code in the query fills it in). */
export default function FamilyJoinRedirect() {
  return <RedirectKeepingParams to="/family/add" params={{ tab: 'join' }} />;
}
