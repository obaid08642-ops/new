import React from 'react';

import { RedirectKeepingParams } from '../../src/components/health/RedirectKeepingParams';

/** My family on Nabd+ is a section of the Emergency tab of the medical profile (merge map, family row E). */
export default function FamilyEmergencyContactsRedirect() {
  return <RedirectKeepingParams to="/health/profile" params={{ tab: 'emergency' }} />;
}
