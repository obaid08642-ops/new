import React, { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { Button } from '../../../packages/ui-native/src';
import { ConsultScreen, Gate, InfoRow, Section, type GateStatus } from '../../src/components/consult/ConsultKit';
import { DetailHead, ListCard, Mark, Price, diagLook, goBackDiag, useDiagText } from '../../src/components/diagnostics/DiagKit';
import { step as scale, useScreenUi } from '../../src/components/screen/ScreenKit';
import { useDiagnosticsCart } from '../../src/context/DiagnosticsCartContext';
import { apiFetch } from '../../src/utils/api';
import { isOffline } from '../../src/utils/isOffline';
import { logError } from '../../src/utils/logger';
import { normalizeLabService, type CatalogItem } from '../../src/utils/labMappers';
import { recordOf } from '../../src/utils/labMappers';

/** A package: what it includes, what it asks of the patient, its price, and the add to cart (board ServiceHub package card, opened). */
export default function PackageDetail() {
  const { theme, t, c, k, num, flow, money } = useScreenUi();
  const text = useDiagText();
  const params = useLocalSearchParams<{ id?: string }>();
  const id = String(params.id ?? '');
  const { addItem, items } = useDiagnosticsCart();
  const [pkg, setPkg] = useState<CatalogItem | null>(null);
  const [status, setStatus] = useState<GateStatus>('loading');

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const item = normalizeLabService(recordOf(await apiFetch<unknown>(`/labs/packages/${id}`)));
      setPkg(item);
      setStatus(item ? 'ready' : 'error');
    } catch (err) {
      logError('diagnostics:package-detail', err);
      setStatus((await isOffline()) ? 'offline' : 'error');
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const inCart = items.some((i) => i.id === id);
  const saving = pkg && pkg.oldPrice !== null && pkg.price !== null && pkg.oldPrice > pkg.price ? pkg.oldPrice - pkg.price : null;
  const look = diagLook(pkg?.category);

  const footer =
    pkg && status === 'ready' ? (
      <>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <View>
            {pkg.oldPrice ? <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, textDecorationLine: 'line-through' }}>{money(pkg.oldPrice)} {k('pharmacy.currency')}</Text> : null}
            {pkg.price !== null ? <Price amount={pkg.price} size="h3" /> : null}
          </View>
          {saving !== null ? (
            <View style={{ minHeight: 28, paddingHorizontal: 12, borderRadius: 14, backgroundColor: c.status.success.bg, justifyContent: 'center' }}>
              <Text style={{ ...scale(t, 'tag', 'bold'), color: c.status.success.fg }}>{k('diag.detail.saving', { amount: `${money(saving)} ${k('pharmacy.currency')}` })}</Text>
            </View>
          ) : null}
        </View>
        <Button
          theme={theme}
          size="lg"
          fullWidth
          variant={inCart ? 'outline' : 'primary'}
          label={inCart ? k('diag.detail.inCart') : k('diag.detail.addToCart')}
          disabled={inCart || pkg.price === null}
          onPress={() => void addItem({ id, name: pkg.name, price: pkg.price ?? 0, kind: 'lab' })}
        />
      </>
    ) : undefined;

  return (
    <ConsultScreen testID="diagnostics-package-detail" title={k('diag.detail.packageTitle')} onBack={goBackDiag} footer={footer} onRefresh={() => void load()}>
      <Gate status={status} onRetry={() => void load()}>
        {pkg ? (
          <>
            <DetailHead icon={look.icon} tone={look.tone} image={pkg.image} title={pkg.name} body={pkg.desc} />
            <ListCard>
              <View style={{ paddingHorizontal: 14 }}>
                <InfoRow label={k('diag.detail.testsCount')} value={pkg.testsCount > 0 ? k('diag.detail.testsN', { n: num(pkg.testsCount) }) : ''} />
                <InfoRow label={k('diag.detail.fasting')} value={pkg.fastingRequired ? (pkg.fastingHours !== null ? text.hours(pkg.fastingHours) : k('diag.detail.fastingYes')) : k('diag.detail.fastingNo')} />
                <InfoRow label={k('diag.detail.turnaround')} value={pkg.turnaroundHours !== null ? text.hours(pkg.turnaroundHours) : ''} />
                <InfoRow label={k('diag.detail.homeVisit')} value={pkg.homeVisit ? k('diag.detail.available') : k('diag.detail.unavailable')} last />
              </View>
            </ListCard>
            {pkg.testsList.length > 0 ? (
              <Section title={k('diag.detail.included')}>
                <ListCard>
                  {pkg.testsList.map((name, i) => (
                    <View key={`${name}-${i}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, minHeight: 48, borderBottomWidth: i === pkg.testsList.length - 1 ? 0 : 1, borderBottomColor: c.border.hairline }}>
                      <Mark kind="check" color={c.status.success.fg} />
                      <Text style={{ flex: 1, minWidth: 0, ...scale(t, 'small', 'regular'), color: c.text.primary, ...flow }}>{name}</Text>
                    </View>
                  ))}
                </ListCard>
              </Section>
            ) : null}
          </>
        ) : null}
      </Gate>
    </ConsultScreen>
  );
}
