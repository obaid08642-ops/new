import React, { useCallback, useEffect, useState } from 'react';
import { router, type Href } from 'expo-router';

import { Search } from '../../../packages/ui-native/src';
import { ConsultList } from '../../src/components/consult/ConsultKit';
import { ListCard, TestRow, diagLook, goBackDiag } from '../../src/components/diagnostics/DiagKit';
import { useScreenUi } from '../../src/components/screen/ScreenKit';
import { apiFetch } from '../../src/utils/api';
import { isOffline } from '../../src/utils/isOffline';
import { logError } from '../../src/utils/logger';
import { normalizeLabList, type CatalogItem } from '../../src/utils/labMappers';

/** Search of the lab tests: the field, and a row per test that opens its page (board Search). */
export default function DiagnosticsSearch() {
  const { theme, k } = useScreenUi();
  const [q, setQ] = useState('');
  const [tests, setTests] = useState<CatalogItem[]>([]);
  const [status, setStatus] = useState<'loading' | 'error' | 'offline' | 'ready'>('loading');

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      setTests(normalizeLabList(await apiFetch<unknown>('/labs/services')));
      setStatus('ready');
    } catch (err) {
      logError('diagnostics:search', err);
      setStatus((await isOffline()) ? 'offline' : 'error');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const needle = q.trim().toLowerCase();
  const shown = needle ? tests.filter((t) => t.name.toLowerCase().includes(needle)) : tests;

  return (
    <ConsultList
      testID="diagnostics-search"
      title={k('diag.search.title')}
      onBack={goBackDiag}
      top={<Search theme={theme} variant="page" value={q} onChange={setQ} onClear={() => setQ('')} clearLabel={k('diag.clear')} placeholder={k('diag.search.placeholder')} label={k('diag.search.placeholder')} />}
      data={shown}
      status={status}
      onRetry={() => void load()}
      keyExtractor={(t) => t.id}
      empty={{ icon: 'magnifying-glass', title: k('diag.search.empty') }}
      renderItem={(t) => (
        <ListCard>
          <TestRow name={t.name} icon={diagLook(t.category)} price={t.price} last onPress={() => router.push(`/diagnostics/test-detail?id=${t.id}` as Href)} />
        </ListCard>
      )}
    />
  );
}
