import React from 'react';

import { RedirectKeepingParams } from '../../src/components/health/RedirectKeepingParams';

/** Old route (merge map, Batch 6, row D): the family chat. */
export default function FamilyChatRedirect() {
  return <RedirectKeepingParams to="/family/chat" />;
}
