import React from 'react';
import { useLocalSearchParams, type Href } from 'expo-router';

import LinkCatcher from '../../src/components/LinkCatcher';

/** Web alias parity: /medicine/:slug is the same link as /p/:slug. */
export default function MedicineAliasCatcher() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  return <LinkCatcher opening="medicine" deps={[slug]} resolve={async () => ({ pathname: '/p/[slug]', params: { slug: String(slug || '') } }) as Href} />;
}
