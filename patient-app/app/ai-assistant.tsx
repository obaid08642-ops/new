import React from 'react';

import { RedirectKeepingParams } from '../src/components/health/RedirectKeepingParams';

/** Old route (merge map section 4, Batch 9): the assistant chat is the assistant screen. */
export default function AppAiAssistantRedirect() {
  return <RedirectKeepingParams to="/ai" params={{ mode: 'symptoms' }} />;
}
