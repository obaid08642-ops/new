import React from 'react';

import { RedirectKeepingParams } from '../../src/components/health/RedirectKeepingParams';

/** The edit form is the Basics tab of the medical profile. */
export default function EditProfileRedirect() {
  return <RedirectKeepingParams to="/health/profile" params={{ tab: 'basics' }} />;
}
