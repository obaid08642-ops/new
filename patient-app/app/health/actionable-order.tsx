import React from 'react';
import { Redirect, type Href } from 'expo-router';

/**
 * Removed as a screen (merge map answer 3): the order of a prescription's medicines is the "اطلب الأدوية دي" action of the
 * prescription itself. Health data is never carried in the route, so nothing is forwarded.
 */
export default function ActionableOrderRedirect() {
  return <Redirect href={'/health/records?tab=prescriptions' as Href} />;
}
