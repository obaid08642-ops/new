import React from 'react';

import { RedirectKeepingParams } from '../../src/components/health/RedirectKeepingParams';

/** Old route (merge map, Batch 6, row B): the member screen (id, name and relation are kept). */
export default function FamilyMemberDetailRedirect() {
  return <RedirectKeepingParams to="/family/member-health" />;
}
