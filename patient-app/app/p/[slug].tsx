// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { apiFetch } from '../../src/utils/api';
import { LocalizedText } from '../../src/components/LocalizedText';
import { ScreenState } from '../../src/components/ScreenStates';

export default function MedicineLinkCatcher() {
  const { slug } = useLocalSearchParams();
  const [err, setErr] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string|null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const entity = await apiFetch(`/entity-graph/related/medicine/${encodeURIComponent(String(slug))}`);
        if (!mounted) return;
        const id = entity?.entity?.id || entity?.entity?.slug || slug;
        if (id) {
          router.replace({ pathname: '/pharmacy/product-detail', params: { id: String(id) } });
        } else {
          setErr(true);
        }
      } catch {
        if (mounted) { setErr(true); setError('تعذر فتح تفاصيل الدواء'); }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [slug]);

  useEffect(() => {
    if (err) {
      router.replace({ pathname: '/search', params: { q: String(slug || '').replace(/-/g, ' ') } });
    }
  }, [err, slug]);

  return (
    <ScreenState loading={loading} error={error} empty={false} emptyTitle="لا توجد بيانات" onRetry={() => setError(null)}>
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' }}>
      <ActivityIndicator size="large" color="#0D9488" />
      <LocalizedText style={{ marginTop: 12, color: '#64748B' }}>جاري فتح تفاصيل الدواء…</LocalizedText>
    </View>
    </ScreenState>
  );
}
