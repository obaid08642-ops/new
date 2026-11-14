import React from 'react';

import { RedirectKeepingParams } from '../../src/components/health/RedirectKeepingParams';

/** Old refund policy screen: the refund section of the legal tab of Help and policies. */
export default function Redirect() {
  return <RedirectKeepingParams to="/settings/help" params={{ tab: 'legal', doc: 'refund_policy' }} />;
}
