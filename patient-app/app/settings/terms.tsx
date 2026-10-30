import React from 'react';

import { RedirectKeepingParams } from '../../src/components/health/RedirectKeepingParams';

/** Old terms screen: the legal tab of Help and policies. */
export default function Redirect() {
  return <RedirectKeepingParams to="/settings/help" params={{ tab: 'legal' }} />;
}
