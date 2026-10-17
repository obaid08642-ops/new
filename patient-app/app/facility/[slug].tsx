import React from 'react';
import { useLocalSearchParams, type Href } from 'expo-router';

import LinkCatcher from '../../src/components/LinkCatcher';
import { apiFetch } from '../../src/utils/api';

type Resolved = { entity?: { id?: string; slug?: string } };

/** A shared facility link (/facility/:slug) opens the clinic page. */
export default function FacilityLinkCatcher() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  return (
    <LinkCatcher
      opening="facility"
      deps={[slug]}
      resolve={async () => {
        const found = await apiFetch<Resolved>(`/entity-graph/related/facility/${encodeURIComponent(String(slug))}`);
        const id = found?.entity?.id || found?.entity?.slug;
        return id ? ({ pathname: '/consultations/clinic/[id]', params: { id: String(id) } } as Href) : null;
      }}
    />
  );
}
