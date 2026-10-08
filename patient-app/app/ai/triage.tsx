import React from 'react';

import { RedirectKeepingParams } from '../../src/components/health/RedirectKeepingParams';

/** Old route (merge map section 4, Batch 9): the guided triage is the symptoms mode of the assistant. */
export default function AppAiTriageRedirect() {
  return <RedirectKeepingParams to="/ai" params={{ mode: 'symptoms' }} />;
}
