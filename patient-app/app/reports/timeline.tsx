import React from 'react';

import { RedirectKeepingParams } from '../../src/components/health/RedirectKeepingParams';

/** The medical timeline is the Timeline tab of the records screen. */
export default function TimelineRedirect() {
  return <RedirectKeepingParams to="/health/records" params={{ tab: 'timeline' }} />;
}
