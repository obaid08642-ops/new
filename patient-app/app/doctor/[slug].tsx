import React from 'react';
import { useLocalSearchParams, type Href } from 'expo-router';

import LinkCatcher from '../../src/components/LinkCatcher';
import { apiFetch } from '../../src/utils/api';

type Resolved = { entity?: { id?: string; slug?: string } };

/** A shared doctor link (/doctor/:slug) opens the doctor's profile. */
export default function DoctorLinkCatcher() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  return (
    <LinkCatcher
      opening="doctor"
      deps={[slug]}
      resolve={async () => {
        const found = await apiFetch<Resolved>(`/entity-graph/related/doctor/${encodeURIComponent(String(slug))}`);
        const id = found?.entity?.id || found?.entity?.slug;
        return id ? ({ pathname: '/consultations/doctor-profile', params: { id: String(id) } } as Href) : null;
      }}
    />
  );
}
