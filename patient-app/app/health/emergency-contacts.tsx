import React from 'react';

import { RedirectKeepingParams } from '../../src/components/health/RedirectKeepingParams';

/** The emergency contacts are the Emergency tab of the medical profile. */
export default function EmergencyContactsRedirect() {
  return <RedirectKeepingParams to="/health/profile" params={{ tab: 'emergency' }} />;
}
