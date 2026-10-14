import React from 'react';

import { RedirectKeepingParams } from '../../src/components/health/RedirectKeepingParams';

/** Old route (merge map section 4, Batch 9): the symptom timeline is the conversation of the assistant. */
export default function AppAiSymptomTimelineRedirect() {
  return <RedirectKeepingParams to="/ai" params={{ mode: 'symptoms' }} />;
}
