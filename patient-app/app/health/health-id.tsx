import React from 'react';
import { Redirect, type Href } from 'expo-router';

/** The Health ID card is the one at /reports/passport (a short-lived token in its QR, never the national id). */
export default function HealthIdRedirect() {
  return <Redirect href={'/reports/passport' as Href} />;
}
