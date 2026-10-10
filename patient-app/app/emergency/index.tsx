import React from 'react';

import { UrgentHelpView } from '../../src/components/emergency/UrgentHelpView';

/** The one urgent-help screen (owner decision 14): the number comes from the admin config, never from the app. */
export default function EmergencyScreen() {
  return <UrgentHelpView />;
}
