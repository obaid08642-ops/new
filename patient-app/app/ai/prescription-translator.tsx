import React from 'react';

import { RedirectKeepingParams } from '../../src/components/health/RedirectKeepingParams';

/** Old route (merge map section 4, Batch 9): the prescription translator is the prescription mode of the assistant. */
export default function AppAiPrescriptionTranslatorRedirect() {
  return <RedirectKeepingParams to="/ai" params={{ mode: 'prescription' }} />;
}
