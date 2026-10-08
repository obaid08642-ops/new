import React from 'react';

import { RedirectKeepingParams } from '../../src/components/health/RedirectKeepingParams';

/** Removed as a screen (merge map 2, section 8, Batch 9): the old voice screen was a list of shortcuts with no capture, so the assistant gets no microphone. */
export default function AppVoiceIndexRedirect() {
  return <RedirectKeepingParams to="/ai" />;
}
