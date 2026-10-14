import React from 'react';

import { RedirectKeepQuery } from '../../src/components/RedirectKeepQuery';

/** Merged into /orders (second pass, section 3): the app had two lists of the same pharmacy orders. Deep links keep their query. */
export default function PharmacyOrderHistoryRedirect() {
  return <RedirectKeepQuery to="/orders" />;
}
