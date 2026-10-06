import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router, type Href } from 'expo-router';

import { Card, FIcon, Input } from '../../../packages/ui-native/src';
import { Chevron, ConsultList, specialtyLook } from '../../src/components/consult/ConsultKit';
import { step as scale, useScreenUi } from '../../src/components/screen/ScreenKit';
import { apiFetch } from '../../src/utils/api';
import { isOffline } from '../../src/utils/isOffline';
import { logError } from '../../src/utils/logger';

/**
 * Choose a specialty — board Consult's specialty row as a list. The list is GET /care/specialties (the real specialties
 * with their live doctor counts, never a fallback list); choosing one opens the doctor search for it.
 */

interface Specialty {
  slug?: string;
  name_ar?: string;
  name_en?: string;
  specialty?: string;
  count?: number;
}

export default function SpecialtySelectScreen() {
  const { theme, t, c, flow, k, num } = useScreenUi();
  const [q, setQ] = useState('');
  const [specs, setSpecs] = useState<Specialty[]>([]);
  const [status, setStatus] = useState<'loading' | 'error' | 'offline' | 'ready'>('loading');

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const res = await apiFetch<Specialty[] | { data?: Specialty[] }>('/care/specialties');
      const list = Array.isArray(res) ? res : res?.data;
      setSpecs(Array.isArray(list) ? list : []);
      setStatus('ready');
    } catch (e) {
      logError('consultations:specialty-select', e);
      setSpecs([]);
      setStatus((await isOffline()) ? 'offline' : 'error');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = q ? specs.filter((s) => (s?.name_ar || s?.name_en || s?.specialty || '').includes(q)) : specs;

  return (
    <ConsultList
      testID="specialty-select-screen"
      title={k('consult.spec.title')}
      top={<Input label={k('consult.spec.searchLabel')} placeholder={k('consult.spec.search')} value={q} onChange={setQ} startIcon="search" theme={theme} testID="specialty-search" />}
      data={filtered}
      status={status}
      onRetry={() => void load()}
      empty={{ icon: 'stethoscope', title: k('consult.spec.empty') }}
      keyExtractor={(sp, i) => sp.slug || String(i)}
      renderItem={(sp) => {
        const look = specialtyLook(sp.name_ar || sp.name_en || sp.specialty);
        const name = sp.name_ar || sp.name_en || sp.specialty || '';
        return (
          <Pressable accessibilityRole="button" accessibilityLabel={name} onPress={() => router.push({ pathname: '/consultations/doctor-search', params: { specialty: sp.name_ar } } as unknown as Href)} style={{ minHeight: 44 }}>
            <Card theme={theme} padding="sm">
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <FIcon icon={look.icon} tone={look.tone} size={52} theme={theme} />
                <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                  <Text style={{ ...scale(t, 'bodyStrong', 'bold'), color: c.text.primary, ...flow }}>{name}</Text>
                  {typeof sp.count === 'number' ? <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{k('consult.spec.count', { n: num(sp.count) })}</Text> : null}
                </View>
                <Chevron />
              </View>
            </Card>
          </Pressable>
        );
      }}
    />
  );
}
