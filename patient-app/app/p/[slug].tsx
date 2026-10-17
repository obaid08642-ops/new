import React from 'react';
import { useLocalSearchParams, type Href } from 'expo-router';

import LinkCatcher from '../../src/components/LinkCatcher';
import { apiFetch } from '../../src/utils/api';

type Resolved = { entity?: { id?: string; slug?: string } };

/** A shared medicine link (/p/:slug) opens the product page. */
export default function MedicineLinkCatcher() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  return (
    <LinkCatcher
      opening="medicine"
      deps={[slug]}
      resolve={async () => {
        const found = await apiFetch<Resolved>(`/entity-graph/related/medicine/${encodeURIComponent(String(slug))}`);
        const id = found?.entity?.id || found?.entity?.slug;
        return id ? ({ pathname: '/pharmacy/product-detail', params: { id: String(id) } } as Href) : null;
      }}
    />
  );
}
