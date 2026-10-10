import React from 'react';
import { Redirect, type Href } from 'expo-router';

/** Removed route (owner decision 35, 2026-10-10: insurance is relay-only, the facility asks the insurer): old links open the insurance hub. */
export default function InsuranceSubmitClaimRedirect() {
  return <Redirect href={'/insurance' as Href} />;
}
