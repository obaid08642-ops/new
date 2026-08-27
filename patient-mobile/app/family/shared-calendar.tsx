// @ts-nocheck
// app/family/shared-calendar.tsx — consolidated into /family/calendar
import React from "react";
import { Redirect } from "expo-router";

export default function SharedCalendarRedirect() {
  return <Redirect href="/family/calendar" />;
}
