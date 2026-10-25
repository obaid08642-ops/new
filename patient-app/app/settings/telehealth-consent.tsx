import React from 'react';

import { RedirectKeepingParams } from '../../src/components/health/RedirectKeepingParams';

/** Old screen: a section of /settings/about (legal tab), opened on this document. */
export default function Redirect() {
  return <RedirectKeepingParams to="/settings/about" params={{ tab: 'legal', doc: 'telehealth_consent' }} />;
}
