import React from 'react';

import { RedirectKeepingParams } from '../../src/components/health/RedirectKeepingParams';

/** Old "My data" screen: the data section of /settings/privacy. */
export default function Redirect() {
  return <RedirectKeepingParams to="/settings/privacy" params={{ tab: 'data' }} />;
}
