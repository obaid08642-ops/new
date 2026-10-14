import React from 'react';

import { RedirectKeepQuery } from '../../src/components/RedirectKeepQuery';

/** Merged into diagnostics/insurance-approval (second pass, section 2): the upload is its first state. Deep links keep their query. */
export default function InsuranceUploadRedirect() {
  return <RedirectKeepQuery to="/diagnostics/insurance-approval" />;
}
