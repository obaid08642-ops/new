import React from 'react';
import { Redirect } from 'expo-router';

/** Community is removed (owner decision 1): the old route opens the articles. */
export default function CommunityHubRedirect() {
  return <Redirect href="/articles" />;
}
