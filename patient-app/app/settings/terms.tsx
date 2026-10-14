import React from 'react';

import { RedirectKeepingParams } from '../../src/components/health/RedirectKeepingParams';

/** Old terms screen: the legal tab of /settings/about. */
export default function Redirect() {
  return <RedirectKeepingParams to="/settings/about" params={{ tab: 'legal' }} />;
}
