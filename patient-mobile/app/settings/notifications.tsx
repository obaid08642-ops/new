// @ts-nocheck
// Legacy alias — the real, API-backed notification preferences screen is
// /settings/notifications-settings (persisted via /users/me/notification-settings).
// This file previously contained a dead duplicate whose toggles changed nothing.
import { Redirect } from "expo-router";
export default function R() {
  return <Redirect href="/settings/notifications-settings" />;
}
