import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { router, type Href } from 'expo-router';

import { Chip, Search } from '../../../packages/ui-native/src';
import { ConsultList } from '../../src/components/consult/ConsultKit';
import { PackageCard, diagLook, goBackDiag } from '../../src/components/diagnostics/DiagKit';
import { useScreenUi } from '../../src/components/screen/ScreenKit';
import { apiFetch } from '../../src/utils/api';
import { isOffline } from '../../src/utils/isOffline';
import { logError } from '../../src/utils/logger';
import { normalizeLabList, rowsOf, type CatalogItem } from '../../src/utils/labMappers';
import { pickLocalized } from '../../src/utils/localize';

interface Category {
  slug: string;
  label: string;
}

/** The packages list: search, the category chips and a card per package (board ServiceHub). */
export default function DiagnosticsPackages() {
  const { theme, k, num } = useScreenUi();
  const [cat, setCat] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'loading' | 'error' | 'offline' | 'ready'>('loading');
  const [packages, setPackages] = useState<CatalogItem[]>([]);
  const [cats, setCats] = useState<Category[]>([]);

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const [pkgRes, catRes] = await Promise.all([apiFetch<unknown>('/labs/packages'), apiFetch<unknown>('/labs/categories')]);
      setPackages(normalizeLabList(pkgRes));
      setCats(
        rowsOf(catRes).flatMap((raw): Category[] => {
          const r = raw as Record<string, unknown>;
          const slug = String(r.slug ?? r.id ?? '');
          const label = String(pickLocalized(r.name_ar as string | undefined, r.name_en as string | undefined) ?? slug);
          return slug ? [{ slug, label }] : [];
        }),
      );
      setStatus('ready');
    } catch (err) {
      logError('diagnostics:packages', err);
      setStatus((await isOffline()) ? 'offline' : 'error');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const needle = query.trim().toLowerCase();
  const shown = packages.filter((p) => (cat === '' || p.category === cat) && (needle === '' || p.name.toLowerCase().includes(needle)));

  const top = (
    <View style={{ gap: 12 }}>
      <Search theme={theme} variant="inline" value={query} onChange={setQuery} onClear={() => setQuery('')} clearLabel={k('diag.clear')} placeholder={k('diag.packages.search')} label={k('diag.packages.search')} />
      {cats.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16 }}>
          <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16 }}>
            <Chip theme={theme} label={k('diag.cat.all')} selected={cat === ''} onPress={() => setCat('')} />
            {cats.map((c) => (
              <Chip key={c.slug} theme={theme} label={c.label} selected={cat === c.slug} onPress={() => setCat(c.slug)} />
            ))}
          </View>
        </ScrollView>
      ) : null}
    </View>
  );

  return (
    <ConsultList
      testID="diagnostics-packages"
      title={k('diag.packages.title')}
      onBack={goBackDiag}
      top={top}
      data={shown}
      status={status}
      onRetry={() => void load()}
      onRefresh={() => void load()}
      keyExtractor={(p) => p.id}
      empty={{ icon: 'package', title: k('diag.packages.empty') }}
      renderItem={(p) => {
        const look = diagLook(p.category);
        return (
          <PackageCard
            name={p.name}
            desc={p.desc}
            count={p.testsCount > 0 ? k('diag.pack.count', { n: num(p.testsCount) }) : undefined}
            price={p.price}
            oldPrice={p.oldPrice}
            icon={look.icon}
            tone={look.tone}
            actionLabel={k('diag.pack.details')}
            onPress={() => router.push(`/diagnostics/package-detail?id=${p.id}` as Href)}
          />
        );
      }}
    />
  );
}
