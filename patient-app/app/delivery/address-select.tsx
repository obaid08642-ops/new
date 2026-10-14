import React from 'react';

import { RedirectKeepingParams } from '../../src/components/health/RedirectKeepingParams';

/** Old delivery address picker: the address book in pick mode. */
export default function Redirect() {
  return <RedirectKeepingParams to="/profile/addresses" params={{ select: '1' }} />;
}
