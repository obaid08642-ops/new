import React from 'react';

import { RedirectKeepingParams } from '../../src/components/health/RedirectKeepingParams';

/** Removed feature (owner decision 4, Batch 9): AI skin analysis is not rebuilt; the route opens the assistant. */
export default function AppAiSkinAnalysisRedirect() {
  return <RedirectKeepingParams to="/ai" />;
}
