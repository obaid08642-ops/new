import React from 'react';

import { RedirectKeepingParams } from '../../src/components/health/RedirectKeepingParams';

/** Old About screen: the about tab of the one Help and policies screen. */
export default function Redirect() {
  return <RedirectKeepingParams to="/settings/help" params={{ tab: 'about' }} />;
}
