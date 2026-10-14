import React from 'react';

import { RedirectKeepingParams } from '../../src/components/health/RedirectKeepingParams';

/** Conditions and allergies are the Conditions tab of the medical profile. */
export default function ConditionsAllergiesRedirect() {
  return <RedirectKeepingParams to="/health/profile" params={{ tab: 'conditions' }} />;
}
