import React from 'react';

import { RedirectKeepQuery } from '../../src/components/RedirectKeepQuery';

/** @deprecated merged into the one "order with a prescription" screen (its "type the names" way in): deep-link-safe redirect. */
export default function PharmacyCustomItemRedirect() {
  return <RedirectKeepQuery to="/pharmacy/rx-order" extra={{ via: 'type' }} />;
}
