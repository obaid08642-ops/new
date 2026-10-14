import React from 'react';

import { RedirectKeepingParams } from '../../src/components/health/RedirectKeepingParams';

/** Old route (merge map, Batch 6, row F): add a member is Invite on /family/add. */
export default function AddFamilyMemberRedirect() {
  return <RedirectKeepingParams to="/family/add" params={{ tab: 'invite' }} />;
}
