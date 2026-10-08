import React from 'react';

import { RedirectKeepQuery } from '../../src/components/RedirectKeepQuery';

/** Merged into the one "scan a medicine" screen (second pass, section 3): the interaction check is a section of the found medicine. Deep links keep their query. */
export default function DrugScannerRedirect() {
  return <RedirectKeepQuery to="/pharmacy/barcode-scanner" />;
}
