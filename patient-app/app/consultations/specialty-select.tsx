import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { router, type Href } from 'expo-router';

import { Input } from '../../../packages/ui-native/src';
import { filterSpecialties } from '../../../packages/ui/icons/specialty-look';
import { ConsultList } from '../../src/components/consult/ConsultKit';
import { SpecialtyTile } from '../../src/components/consult/SpecialtyTiles';
import { specialtyNameKey, specialtyNamesBySlug, specialtyTileModels } from '../../src/utils/consultSpecialties';
import { step as scale, useScreenUi } from '../../src/components/screen/ScreenKit';
import { apiFetch } from '../../src/utils/api';
import { fetchPublicList } from '../../src/utils/publicCache';
import { isOffline } from '../../src/utils/isOffline';
import { logError } from '../../src/utils/logger';
import { pickLocalized } from '../../src/utils/localize';

/**
 * All specialties — a grid of illustrated tiles with a search (the name in the app language, Arabic or English). The list is GET /care/specialties (the real specialties
 * with their live doctor counts, never a fallback list); choosing one opens the doctor search for it.
 */

const PER_ROW = 4;

interface Specialty {
  slug?: string;
  name_ar?: string;
  name_en?: string;
  specialty?: string;
  count?: number;
}

export default function SpecialtySelectScreen() {
  const { theme, t, c, flow, k, lang } = useScreenUi();
  const [q, setQ] = useState('');
  // a tapped specialty with no doctor yet: the "Coming soon" note shows instead of an empty doctor list
  const [specs, setSpecs] = useState<Specialty[]>([]);
  const [status, setStatus] = useState<'loading' | 'error' | 'offline' | 'ready'>('loading');

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const res = await fetchPublicList<Specialty[] | { data?: Specialty[] }>('/care/specialties');
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

  const tiles = useMemo(
    () => specialtyTileModels(specs, (slug, nameAr, nameEn) => { const key = specialtyNameKey(slug); return key ? k(key) : pickLocalized(nameAr, nameEn) || ''; }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [specs, lang],
  );
  const arabicNames = useMemo(() => Object.fromEntries(specs.flatMap((row) => (row.slug ? [[row.slug, row.name_ar]] : []))) as Record<string, string | undefined>, [specs]);
  // search: the name in the app language, the Arabic and the English name
  const filtered = useMemo(() => filterSpecialties(tiles, q, specialtyNamesBySlug(specs)), [tiles, q, specs]);
  // four tiles to a row, the list virtualised by rows
  const rows = useMemo(() => Array.from({ length: Math.ceil(filtered.length / PER_ROW) }, (_, i) => filtered.slice(i * PER_ROW, i * PER_ROW + PER_ROW)), [filtered]);

  return (
    <ConsultList
      testID="specialty-select-screen"
      title={k('consult.spec.title')}
      top={
        <View style={{ gap: 10 }}>
          <Input label={k('consult.spec.searchLabel')} placeholder={k('consult.spec.search')} value={q} onChange={setQ} startIcon="search" theme={theme} testID="specialty-search" />
        </View>
      }
      data={rows}
      status={status}
      onRetry={() => void load()}
      empty={{ icon: 'stethoscope', title: k('consult.spec.empty') }}
      keyExtractor={(row, i) => row[0]?.slug || String(i)}
      renderItem={(row) => (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {row.map((tile) => (
            <SpecialtyTile
              key={tile.slug}
              id={tile.slug}
              fill
              label={tile.name}
              look={tile.look}
              onPress={() => router.push({ pathname: '/consultations/doctor-search', params: { specialty: arabicNames[tile.slug] } } as unknown as Href)}
            />
          ))}
          {Array.from({ length: PER_ROW - row.length }, (_, i) => <View key={`pad${i}`} style={{ flex: 1 }} />)}
        </View>
      )}
    />
  );
}
