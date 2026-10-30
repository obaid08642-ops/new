import React, { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { router, useLocalSearchParams, type Href } from 'expo-router';

import { Button } from '../../../packages/ui-native/src';
import { ConsultScreen, Gate, InfoRow, Section, type GateStatus } from '../../src/components/consult/ConsultKit';
import { OffersSection, isUnoffered } from '../../src/components/diagnostics/CatalogueKit';
import { Block, DetailHead, ListCard, Price, diagLook, goBackDiag, useDiagText } from '../../src/components/diagnostics/DiagKit';
import { useServiceCartAction } from '../../src/components/cart/ServiceCartButton';
import { ItemOrderingPanel } from '../../src/components/ordering/ItemOrderingPanel';
import { Notice } from '../../src/components/pharmacy/OfferKit';
import { step as scale, useScreenUi } from '../../src/components/screen/ScreenKit';
import { useDiagnosticsCart } from '../../src/context/DiagnosticsCartContext';
import { apiFetch } from '../../src/utils/api';
import { isOffline } from '../../src/utils/isOffline';
import { logError } from '../../src/utils/logger';
import { FieldText, MarkNote, markTextProps } from '../../src/components/LocalizedField';
import { catalogArt } from '../../src/utils/diagCatalog';
import { singleOrderRoute } from '../../src/utils/singleOrder';
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
  const cartActions = useServiceCartAction(kind);
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
  // a service no provider offers yet can be asked for ("Notify me") but not ordered
  const unoffered = data ? isUnoffered(data) : false;
  const look = diagLook(data?.category, kind);
  const add = () => {
    if (data && !inCart) void addItem({ id, name: data.name, price: data.price ?? 0, kind });
  };

  const footer =
    data && status === 'ready' && !unoffered ? (
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
              label={k('diag.detail.orderNow')}
              // "Order now" skips the cart: this one item goes to the lab choice, the time and the payment
              onPress={() => router.push(singleOrderRoute({ kind, id, name: data.name }) as unknown as Href)}
            />
          </View>
        </View>
      </>
    ) : undefined;

  return (
    <ConsultScreen testID="diagnostics-test-detail" title={isRadiology ? k('diag.detail.scanTitle') : k('diag.detail.testTitle')} onBack={goBackDiag} actions={cartActions} footer={footer} onRefresh={() => void load()}>
      <Gate status={status} onRetry={() => void load()}>
        {data ? (
          <>
            <DetailHead icon={look.icon} tone={look.tone} art={catalogArt(kind, data)} image={data.image} title={data.name} titleMark={data.nameMark} />
            {data.desc ? (
              <Section title={k('diag.detail.about')}>
                <Block>
                  <FieldText text={data.desc} mark={data.descMark} style={{ ...scale(t, 'small', 'regular'), lineHeight: 24, color: c.text.secondary, ...flow }} />
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
                        <Text {...markTextProps(data.prepMark)} style={[{ flex: 1, minWidth: 0, ...scale(t, 'small', 'regular'), lineHeight: 22, color: c.text.secondary, ...flow }, markTextProps(data.prepMark).style]}>{p}</Text>
                      </View>
                    ))}
                    <MarkNote mark={data.prepMark} />
                  </Block>
                ) : null}
              </Section>
            ) : null}
            <OffersSection kind={kind} serviceId={id} offer={data.offer} offers={data.offers} />
            {unoffered ? null : <ItemOrderingPanel kind={kind} catalogId={id} />}
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
