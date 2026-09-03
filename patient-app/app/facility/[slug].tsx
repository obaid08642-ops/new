// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { apiFetch } from '../../src/utils/api';
import { LocalizedText } from '../../src/components/LocalizedText';

export default function FacilityLinkCatcher() {
  const { slug } = useLocalSearchParams();
  const [err, setErr] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const entity = await apiFetch(`/entity-graph/related/facility/${encodeURIComponent(String(slug))}`);
        if (!mounted) return;
        const id = entity?.entity?.id || entity?.entity?.slug || slug;
        if (id) {
          router.replace({ pathname: '/consultations/clinic/[id]', params: { id: String(id) } });
        } else {
          setErr(true);
        }
      } catch {
        if (mounted) setErr(true);
      }
    })();
    return () => { mounted = false; };
  }, [slug]);

  if (err) {
    router.replace({ pathname: '/consultations/clinics' });
    return null;
  }

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' }}>
      <ActivityIndicator size="large" color="#0D9488" />
      <LocalizedText style={{ marginTop: 12, color: '#64748B' }}>جاري فتح المركز الطبي…</LocalizedText>
    </View>
  );
}
