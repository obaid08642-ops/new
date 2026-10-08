import React from 'react';

import { RedirectKeepingParams } from '../../src/components/health/RedirectKeepingParams';

/** Old route (merge map, Batch 6, row B): a member's permissions are a tab of the member screen (id, name and relation are kept). */
export default function FamilyPermissionsRedirect() {
  return <RedirectKeepingParams to="/family/member-health" params={{ tab: 'permissions' }} />;
}
