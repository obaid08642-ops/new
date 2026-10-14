import React from 'react';

import { RedirectKeepingParams } from '../../src/components/health/RedirectKeepingParams';

/** Old route (merge map section 4, Batch 9): the symptom checker is the symptoms mode of the assistant. */
export default function AppAiSymptomCheckerRedirect() {
  return <RedirectKeepingParams to="/ai" params={{ mode: 'symptoms' }} />;
}
