import React from 'react';
import { RedirectKeepingParams } from '../../src/components/health/RedirectKeepingParams';

export default function LoyaltyRewardsRedirect() {
  return <RedirectKeepingParams to="/loyalty/hub" params={{ tab: 'rewards' }} />;
}
