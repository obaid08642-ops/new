import React from 'react';

import { RedirectKeepQuery } from '../../src/components/RedirectKeepQuery';

/** Merged into the one "order with a prescription" screen (second pass, section 11): this is its photo way in. Deep links keep their query. */
export default function PharmacyScanPrescriptionRedirect() {
  return <RedirectKeepQuery to="/pharmacy/rx-order" extra={{ via: 'photo' }} />;
}
