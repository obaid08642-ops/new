import React from 'react';

import { RedirectKeepingParams } from '../../src/components/health/RedirectKeepingParams';

/** Old route (merge map, Batch 6, row F): Invite is a tab of /family/add. */
export default function FamilyInviteRedirect() {
  return <RedirectKeepingParams to="/family/add" params={{ tab: 'invite' }} />;
}
