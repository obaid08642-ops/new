import React, { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { router, useLocalSearchParams, type Href } from 'expo-router';

import { Button } from '../../../packages/ui-native/src';
import { ConsultScreen, Gate, InfoRow, Section, type GateStatus } from '../../src/components/consult/ConsultKit';
import { Block, DetailHead, ListCard, Price, diagLook, goBackDiag, useDiagText } from '../../src/components/diagnostics/DiagKit';
import { Notice } from '../../src/components/pharmacy/OfferKit';
import { step as scale, useScreenUi } from '../../src/components/screen/ScreenKit';
import { useDiagnosticsCart } from '../../src/context/DiagnosticsCartContext';
import { apiFetch } from '../../src/utils/api';
import { isOffline } from '../../src/utils/isOffline';
import { logError } from '../../src/utils/logger';
import { normalizeLabService, recordOf, type CatalogItem } from '../../src/utils/labMappers';

/** One lab test or scan: what it is, how to prepare, when the result comes, the price and the add / book actions. */
export default function TestDetail() {
  const { theme, t, c, k, flow } = useScreenUi();
  const text = useDiagText();
  const params = useLocalSearchParams<{ id?: string; type?: string; isRadiology?: string }>();
  const id = String(params.id ?? '');
  // Cards pass isRadiology=true; search passes type=radiology — accept both
  const isRadiology = params.type === 'radiology' || params.isRadiology === 'true';
  const kind = isRadiology ? 'radiology' : 'lab';
  const { addItem, items } = useDiagnosticsCart();
  const [data, setData] = useState<CatalogItem | null>(null);
  const [status, setStatus] = useState<GateStatus>('loading');

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const item = normalizeLabService(recordOf(await apiFetch<unknown>(isRadiology ? `/radiology/services/${id}` : `/labs/services/${id}`)));
      setData(item);
      setStatus(item ? 'ready' : 'error');
    } catch (err) {
      logError('diagnostics:test-detail', err);
      setStatus((await isOffline()) ? 'offline' : 'error');
    }
  }, [id, isRadiology]);

  useEffect(() => {
    void load();
  }, [load]);

  const inCart = items.some((i) => i.id === id);
  const look = diagLook(data?.category, kind);
  const add = () => {
    if (data && !inCart) void addItem({ id, name: data.name, price: data.price ?? 0, kind });
  };

  const footer =
    data && status === 'ready' ? (
      <>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <Text style={{ ...scale(t, 'small', 'regular'), color: c.text.secondary }}>{k('diag.detail.total')}</Text>
          {data.price !== null ? <Price amount={data.price} size="h3" /> : null}
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Button theme={theme} size="lg" fullWidth variant="outline" label={inCart ? k('diag.detail.inCart') : k('diag.detail.addToCart')} disabled={inCart} onPress={add} />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              theme={theme}
              size="lg"
              fullWidth
              label={k('diag.detail.bookNow')}
              onPress={() => {
                add();
                router.push('/diagnostics/cart' as Href);
              }}
            />
          </View>
        </View>
      </>
    ) : undefined;

  return (
    <ConsultScreen testID="diagnostics-test-detail" title={isRadiology ? k('diag.detail.scanTitle') : k('diag.detail.testTitle')} onBack={goBackDiag} footer={footer} onRefresh={() => void load()}>
      <Gate status={status} onRetry={() => void load()}>
        {data ? (
          <>
            <DetailHead icon={look.icon} tone={look.tone} image={data.image} title={data.name} />
            {data.desc ? (
              <Section title={k('diag.detail.about')}>
                <Block>
                  <Text style={{ ...scale(t, 'small', 'regular'), lineHeight: 24, color: c.text.secondary, ...flow }}>{data.desc}</Text>
                </Block>
              </Section>
            ) : null}
            {data.fastingRequired || data.preparation.length > 0 ? (
              <Section title={k('diag.detail.prep')}>
                {data.fastingRequired ? <Notice tone="warning" text={data.fastingHours !== null ? k('diag.detail.fastingFor', { time: text.hours(data.fastingHours) }) : k('diag.detail.fastingYes')} /> : null}
                {data.preparation.length > 0 ? (
                  <Block gap={8}>
                    {data.preparation.map((p, i) => (
                      <View key={`${p}-${i}`} style={{ flexDirection: 'row', gap: 8 }}>
                        <Text style={{ ...scale(t, 'small', 'bold'), color: c.text.link }}>•</Text>
                        <Text style={{ flex: 1, minWidth: 0, ...scale(t, 'small', 'regular'), lineHeight: 22, color: c.text.secondary, ...flow }}>{p}</Text>
                      </View>
                    ))}
                  </Block>
                ) : null}
              </Section>
            ) : null}
            {data.turnaroundHours !== null ? (
              <ListCard>
                <View style={{ paddingHorizontal: 14 }}>
                  <InfoRow label={k('diag.detail.resultTime')} value={text.hours(data.turnaroundHours)} last />
                </View>
              </ListCard>
            ) : null}
          </>
        ) : null}
      </Gate>
    </ConsultScreen>
  );
}
