import React, { useCallback, useEffect, useState } from 'react';
import { Linking, Text, View } from 'react-native';
import { router, useLocalSearchParams, type Href } from 'expo-router';

import { Button } from '../../../../packages/ui-native/src';
import { ConsultScreen, Gate, InfoRow, Section, type GateStatus } from '../../../src/components/consult/ConsultKit';
import { DetailHead, ListCard, LAB_TONE, TestRow, diagLook, goBackDiag, useDiagText } from '../../../src/components/diagnostics/DiagKit';
import { showLocalizedAlert } from '../../../src/components/LocalizedAlert';
import { step as scale, useScreenUi } from '../../../src/components/screen/ScreenKit';
import { useDiagnosticsCart } from '../../../src/context/DiagnosticsCartContext';
import { apiFetch } from '../../../src/utils/api';
import { isOffline } from '../../../src/utils/isOffline';
import { logError } from '../../../src/utils/logger';
import { normalizeLabList, normalizeProvider, recordOf, type CatalogItem, type LabProvider } from '../../../src/utils/labMappers';

/** A lab's profile: who it is, how to get there, and the tests it offers with the add toggle (board ServiceHub lab card, opened). */
export default function LabProfile() {
  const { theme, t, c, k, num, flow } = useScreenUi();
  const text = useDiagText();
  const { id: rawId } = useLocalSearchParams<{ id: string }>();
  const id = String(rawId ?? '');
  const { items, addItem, removeItem } = useDiagnosticsCart();
  const [lab, setLab] = useState<LabProvider | null>(null);
  const [tests, setTests] = useState<CatalogItem[]>([]);
  const [status, setStatus] = useState<GateStatus>('loading');

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const [labRes, testsRes] = await Promise.all([apiFetch<unknown>(`/providers/${id}`), apiFetch<unknown>(`/labs/services?providerId=${id}`)]);
      const provider = normalizeProvider(recordOf(labRes));
      setLab(provider);
      setTests(normalizeLabList(testsRes));
      setStatus(provider ? 'ready' : 'error');
    } catch (err) {
      logError('diagnostics:lab:detail', err);
      setStatus((await isOffline()) ? 'offline' : 'error');
    }
  }, [id]);

  useEffect(() => {
    if (id) void load();
  }, [id, load]);

  const openMaps = () => {
    if (!lab) return;
    const url = lab.lat !== null && lab.lng !== null ? `https://www.google.com/maps/dir/?api=1&destination=${lab.lat},${lab.lng}` : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lab.address)}`;
    Linking.openURL(url).catch(() => showLocalizedAlert(k('diag.lab.mapsFailed')));
  };
  const isAdded = (testId: string) => items.some((item) => item.id === testId && (item.lockedProviderId === id || !item.lockedProviderId));

  return (
    <ConsultScreen testID="diagnostics-lab" title={k('diag.lab.title')} onBack={goBackDiag} onRefresh={() => void load()}>
      <Gate status={status} onRetry={() => void load()}>
        {lab ? (
          <>
            <DetailHead icon="test-tube" tone={LAB_TONE} title={lab.name} body={lab.description || undefined} />
            <ListCard>
              <View style={{ paddingHorizontal: 14 }}>
                <InfoRow label={k('diag.lab.rating')} value={lab.rating !== null ? num(lab.rating, { maximumFractionDigits: 1 }) : ''} />
                <InfoRow label={k('diag.lab.distance')} value={text.distance(lab.distance)} />
                <InfoRow label={k('diag.lab.branches')} value={lab.branches !== null ? num(lab.branches) : ''} />
                <InfoRow label={k('diag.lab.address')} value={lab.address} last />
              </View>
            </ListCard>
            {(lab.lat !== null && lab.lng !== null) || lab.address ? <Button theme={theme} size="lg" fullWidth variant="outline" startIcon="map-pin" label={k('diag.lab.directions')} onPress={openMaps} /> : null}
            <Section title={k('diag.lab.tests')}>
              {tests.length > 0 ? (
                <ListCard>
                  {tests.map((test, i) => {
                    const on = isAdded(test.id);
                    return (
                      <TestRow
                        key={test.id}
                        name={test.name}
                        icon={diagLook(test.category)}
                        price={test.price}
                        last={i === tests.length - 1}
                        onPress={() => router.push(`/diagnostics/test-detail?id=${test.id}&labId=${id}` as Href)}
                        toggle={{
                          on,
                          label: on ? k('diag.cart.remove', { name: test.name }) : k('diag.cart.add', { name: test.name }),
                          onPress: () => (on ? void removeItem(test.id, 'lab') : void addItem({ id: test.id, name: test.name, price: test.price ?? 0, kind: 'lab', lockedProviderId: id })),
                        }}
                      />
                    );
                  })}
                </ListCard>
              ) : (
                <Text style={{ ...scale(t, 'small', 'regular'), color: c.text.secondary, ...flow }}>{k('diag.lab.noTests')}</Text>
              )}
            </Section>
          </>
        ) : null}
      </Gate>
    </ConsultScreen>
  );
}
