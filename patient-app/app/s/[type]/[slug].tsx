// @ts-nocheck
/**
 * M6 / ER-12: universal-link catcher for public SEO pages.
 * https://app.nabdahplus.com/s/:type/:slug resolves the entity via the
 * backend SEO service and forwards to the matching in-app screen.
 * If resolution fails the user lands on search with the slug as query.
 */
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { apiFetch } from '../../../src/utils/api';
import { LocalizedText } from '../../../src/components/LocalizedText';

const TYPE_ROUTE = {
  medicine: (id) => ({ pathname: '/pharmacy/product-detail', params: { id } }),
  doctor: (id) => ({ pathname: '/consultations/doctor-profile', params: { id } }),
  facility: (id) => ({ pathname: '/consultations/clinic/[id]', params: { id } }),
  'lab-service': (id) => ({ pathname: '/diagnostics/search', params: { serviceId: id } }),
  'home-care-service': (id) => ({ pathname: '/nursing', params: { serviceId: id } }),
};

export default function PublicLinkCatcher() {
  const { type, slug } = useLocalSearchParams();
  const [err, setErr] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const entity = await apiFetch(`/seo/resolve/${type}/${encodeURIComponent(String(slug))}`);
        if (!mounted) return;
        const id = entity?.id;
        const factory = TYPE_ROUTE[String(type)];
        if (id && factory) {
          router.replace(factory(id));
        } else {
          setErr(true);
        }
      } catch {
        if (mounted) setErr(true);
      }
    })();
    return () => { mounted = false; };
  }, [type, slug]);

  if (err) {
    // Fallback: global search with the slug as query
    router.replace({ pathname: '/search', params: { q: String(slug || '').replace(/-/g, ' ') } });
    return null;
  }

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' }}>
      <ActivityIndicator size="large" color="#0D9488" />
      <LocalizedText style={{ marginTop: 12, color: '#64748B' }}>جاري فتح الرابط…</LocalizedText>
    </View>
  );
}
