import React from 'react';

import { RedirectKeepingParams } from '../../src/components/health/RedirectKeepingParams';

/** The chronic diseases are the Conditions tab of the medical profile. */
export default function ChronicDiseaseRedirect() {
  return <RedirectKeepingParams to="/health/profile" params={{ tab: 'conditions' }} />;
}
