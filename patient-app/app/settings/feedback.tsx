import React from 'react';

import { RedirectKeepingParams } from '../../src/components/health/RedirectKeepingParams';

/** Old feedback screen: the feedback tab of /settings/help. */
export default function Redirect() {
  return <RedirectKeepingParams to="/settings/help" params={{ tab: 'feedback' }} />;
}
