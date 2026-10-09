import React from 'react';

import { NotificationSettingsView } from '../../src/components/account/SettingsViews';

/** Notification settings (GET/PATCH /users/me/notification-settings); absorbs /settings/notifications-settings. */
export default function Screen() {
  return <NotificationSettingsView />;
}
