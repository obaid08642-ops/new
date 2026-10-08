import React from 'react';
import { useLocalSearchParams } from 'expo-router';

import { RedirectKeepingParams } from '../../src/components/health/RedirectKeepingParams';

/** "Add reminder" is a sheet of the medications screen; an `id` opens it to edit that reminder. */
export default function MedicationReminderAddRedirect() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  return <RedirectKeepingParams to="/health/medications" params={typeof id === 'string' && id ? { tab: 'reminders', edit: id } : { tab: 'reminders', add: '1' }} />;
}
