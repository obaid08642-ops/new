import React from 'react';
import { useLocalSearchParams, type Href } from 'expo-router';

import LinkCatcher from '../../../src/components/LinkCatcher';
import { apiFetch } from '../../../src/utils/api';

/**
 * Universal-link catcher for the public SEO pages: https://app.nabdahplus.com/s/:type/:slug is resolved by the
 * backend SEO service and forwarded to the matching screen.
 */
const TYPE_ROUTE: Record<string, (id: string) => Href> = {
  medicine: (id) => ({ pathname: '/pharmacy/product-detail', params: { id } }) as Href,
  doctor: (id) => ({ pathname: '/consultations/doctor-profile', params: { id } }) as Href,
  facility: (id) => ({ pathname: '/consultations/clinic/[id]', params: { id } }) as Href,
  'lab-service': (id) => ({ pathname: '/diagnostics/search', params: { serviceId: id } }) as Href,
  'home-care-service': (id) => ({ pathname: '/nursing', params: { serviceId: id } }) as Href,
};

export default function PublicLinkCatcher() {
  const { type, slug } = useLocalSearchParams<{ type: string; slug: string }>();
  return (
    <LinkCatcher
      opening="link"
      deps={[type, slug]}
      resolve={async () => {
        const factory = TYPE_ROUTE[String(type)];
        if (!factory) return null;
        const found = await apiFetch<{ id?: string }>(`/seo/resolve/${type}/${encodeURIComponent(String(slug))}`);
        return found?.id ? factory(String(found.id)) : null;
      }}
    />
  );
}
