import React from 'react';

import { RedirectKeepingParams } from '../../src/components/health/RedirectKeepingParams';

/** The vitals log is the History tab of the vitals screen. */
export default function VitalsLogRedirect() {
  return <RedirectKeepingParams to="/health/vitals" params={{ tab: 'history' }} />;
}
