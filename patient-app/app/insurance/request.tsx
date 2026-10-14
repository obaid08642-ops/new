import React from 'react';

import { InsuranceRequestView } from '../../src/components/insurance/InsuranceRequestView';

/** One insurance request, its state decides what shows (merge map 2, section 6). `?id=` is the request. */
export default function InsuranceRequestScreen() {
  return <InsuranceRequestView />;
}
