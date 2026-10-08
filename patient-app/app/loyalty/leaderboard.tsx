import React from 'react';
import { RedirectKeepingParams } from '../../src/components/health/RedirectKeepingParams';

/** The leaderboard is a removed feature (owner decision 2, 2026-10-06): an old link or notification opens the hub. */
export default function LoyaltyLeaderboardRedirect() {
  return <RedirectKeepingParams to="/loyalty/hub" />;
}
