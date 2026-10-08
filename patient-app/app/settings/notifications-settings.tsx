import React from 'react';

import { RedirectKeepingParams } from '../../src/components/health/RedirectKeepingParams';

/** Old route of the notification settings: the screen is /settings/notifications. */
export default function Redirect() {
  return <RedirectKeepingParams to="/settings/notifications" />;
}
