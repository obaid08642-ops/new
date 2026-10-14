import React from 'react';

import { RedirectKeepingParams } from '../../src/components/health/RedirectKeepingParams';

/** Old route (merge map 2, section 6): the payment split is the request page; `request_id` is kept. */
export default function PaymentSplitRedirect() {
  return <RedirectKeepingParams to="/insurance/request" />;
}
