import React, { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { router, useLocalSearchParams, type Href } from 'expo-router';

import { Button } from '../../../packages/ui-native/src';
import { ConsultList } from '../../src/components/consult/ConsultKit';
import { LabCard, Price, goBackDiag, useDiagText } from '../../src/components/diagnostics/DiagKit';
import { showLocalizedAlert } from '../../src/components/LocalizedAlert';
import { step as scale, useScreenUi } from '../../src/components/screen/ScreenKit';
import { useDiagnosticsCart } from '../../src/context/DiagnosticsCartContext';
import { apiFetch } from '../../src/utils/api';
import { isOffline } from '../../src/utils/isOffline';
import { logError } from '../../src/utils/logger';
import { normalizeProviders, recordOf, type LabProvider } from '../../src/utils/labMappers';

/** The labs that can do one test, side by side with the price (board ServiceHub "approved labs"); booking adds it to the cart for that lab. */
export default function LabComparison() {
  const { theme, t, c, k, num, flow } = useScreenUi();
  const text = useDiagText();
  const { id, name } = useLocalSearchParams<{ id: string; name: string }>();
  const { addItem } = useDiagnosticsCart();
  const [adding, setAdding] = useState(false);
  const [labs, setLabs] = useState<LabProvider[]>([]);
  const [basePrice, setBasePrice] = useState(0);
  const [status, setStatus] = useState<'loading' | 'error' | 'offline' | 'ready'>('loading');

  const testName = name || k('diag.compare.chosenTest');

  const load = useCallback(async () => {
    if (!id) {
      setStatus('ready');
      return;
    }
    setStatus('loading');
    try {
      const [svcRes, labsRes] = await Promise.all([apiFetch<unknown>(`/labs/services/${id}`), apiFetch<unknown>(`/labs/compatible-providers?testIds=${id}`)]);
      setBasePrice(Number(recordOf(svcRes)?.price ?? 0) || 0);
      setLabs(normalizeProviders(labsRes));
      setStatus('ready');
    } catch (err) {
      logError('diagnostics:lab-comparison', err);
      setStatus((await isOffline()) ? 'offline' : 'error');
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const processAdd = async (lab: LabProvider, isHomeVisit: boolean) => {
    try {
      await addItem({
        id: String(id),
        name: `${testName} - ${lab.name}`,
        price: basePrice,
        kind: 'lab',
        provider: lab.name,
        lockedProviderId: lab.id,
        isHomeVisit,
      });
      router.push('/diagnostics/cart' as Href);
    } finally {
      setAdding(false);
    }
  };

  const handleBook = async (lab: LabProvider) => {
    setAdding(true);
    // Ask the user whether they want a home visit or a visit to the lab (when the lab does home visits)
    if (lab.homeVisit) {
      showLocalizedAlert(k('diag.compare.placeTitle'), k('diag.compare.placeBody'), [
        { text: k('diag.compare.cancel'), style: 'cancel', onPress: () => setAdding(false) },
        { text: k('diag.compare.visitLab'), onPress: () => void processAdd(lab, false) },
        { text: k('diag.compare.homeVisit'), onPress: () => void processAdd(lab, true) },
      ]);
    } else {
      await processAdd(lab, false);
    }
  };

  return (
    <ConsultList
      testID="diagnostics-lab-comparison"
      title={k('diag.compare.title')}
      onBack={goBackDiag}
      top={
        <View style={{ gap: 2 }}>
          <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{k('diag.compare.pricesFor')}</Text>
          <Text accessibilityRole="header" style={{ ...scale(t, 'h3'), color: c.text.primary, ...flow }}>{testName}</Text>
        </View>
      }
      data={labs}
      status={status}
      onRetry={() => void load()}
      keyExtractor={(l) => l.id}
      empty={{ icon: 'test-tube', title: k('diag.compare.empty') }}
      renderItem={(lab) => (
        <LabCard
          name={lab.name}
          line={[lab.rating !== null ? k('diag.rating', { n: num(lab.rating, { maximumFractionDigits: 1 }) }) : '', text.distance(lab.distance)].filter(Boolean).join(' · ')}
          tags={lab.homeVisit ? [{ label: k('diag.tag.home'), tone: 'neutral' }] : undefined}
          onPress={undefined}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <View style={{ flex: 1, minWidth: 0 }}>
              {basePrice > 0 ? <Price amount={basePrice} size="h4" /> : <Text style={{ ...scale(t, 'small', 'bold'), color: c.text.primary, ...flow }}>{k('diag.compare.priceAtBooking')}</Text>}
              <Text style={{ ...scale(t, 'tag', 'regular'), color: c.text.secondary, ...flow }}>{k('diag.compare.availability')}</Text>
            </View>
            <Button theme={theme} size="md" label={k('diag.compare.book')} disabled={adding} onPress={() => void handleBook(lab)} />
          </View>
        </LabCard>
      )}
    />
  );
}
