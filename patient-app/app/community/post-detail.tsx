import React from 'react';
import { Redirect } from 'expo-router';

/** Community is removed (owner decision 1): a stale link to a post opens the articles. */
export default function CommunityPostRedirect() {
  return <Redirect href="/articles" />;
}
