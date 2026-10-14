import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { router, type Href } from 'expo-router';

import { Button, EmptyState, FIcon, Segmented, Stepper } from '../../../packages/ui-native/src';
import { ConsultScreen, Section } from '../../src/components/consult/ConsultKit';
import { AmountLine, Block, LAB_TONE, LabCard, RAD_TONE, goBackDiag, useDiagText } from '../../src/components/diagnostics/DiagKit';
import { Glyph } from '../../src/components/pharmacy/PharmacyKit';
import { step as scale, useScreenUi } from '../../src/components/screen/ScreenKit';
import { useDiagnosticsCart } from '../../src/context/DiagnosticsCartContext';
import { apiFetch } from '../../src/utils/api';
import { logError } from '../../src/utils/logger';
import { normalizeProviders, type LabProvider } from '../../src/utils/labMappers';

/** The labs and radiology cart (board Cart): the lines with quantity, the place, the labs that can do all of it, and the total. */
export default function DiagnosticsCart() {
  const { theme, t, c, k, num, flow } = useScreenUi();
  const text = useDiagText();
  const { items, removeItem, updateQty, itemCount, clearCart } = useDiagnosticsCart();
  const [serviceType, setServiceType] = useState<'home' | 'clinic'>('home');
  const [selectedLab, setSelectedLab] = useState<string | null>(null);
  const [compatibleLabs, setCompatibleLabs] = useState<LabProvider[]>([]);
  const [loadingLabs, setLoadingLabs] = useState(false);

  useEffect(() => {
    if (items.length > 0) {
      setLoadingLabs(true);
      // Lab tests and scans are matched by their own services; a mixed cart needs a provider doing both.
      const labIds = items.filter((i) => i.kind !== 'radiology').map((i) => i.id);
      const scanIds = items.filter((i) => i.kind === 'radiology').map((i) => i.id);
      Promise.all([
        labIds.length ? apiFetch<unknown>(`/labs/compatible-providers?testIds=${labIds.join(',')}`).then(normalizeProviders) : Promise.resolve(null),
        scanIds.length ? apiFetch<unknown>(`/radiology/compatible-providers?serviceIds=${scanIds.join(',')}`).then(normalizeProviders) : Promise.resolve(null),
      ])
        .then(([labs, centers]) => setCompatibleLabs(labs && centers ? labs.filter((l) => centers.some((ce) => ce.id === l.id)) : labs || centers || []))
        .catch((e: unknown) => logError('diagnostics:cart', e))
        .finally(() => setLoadingLabs(false));
    } else {
      setCompatibleLabs([]);
      setSelectedLab(null);
    }
  }, [items]);

  // The base total of the lines
  const baseTotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);

  if (itemCount === 0) {
    return (
      <ConsultScreen testID="diagnostics-cart" title={k('diag.cart.title')} onBack={goBackDiag}>
        <EmptyState icon="test-tube" tone={LAB_TONE} title={k('diag.cart.emptyTitle')} body={k('diag.cart.emptyBody')} actionLabel={k('diag.cart.back')} onAction={goBackDiag} theme={theme} />
      </ConsultScreen>
    );
  }

  const footer = selectedLab ? (
    <>
      <AmountLine label={k('diag.cart.total')} amount={baseTotal} strong />
      <Button
        theme={theme}
        size="lg"
        fullWidth
        label={k('diag.cart.continue')}
        onPress={() => {
          const lab = compatibleLabs.find((l) => l.id === selectedLab);
          router.push({ pathname: '/diagnostics/checkout', params: { serviceType, labName: lab?.name, labId: selectedLab } } as unknown as Href);
        }}
      />
    </>
  ) : undefined;

  return (
    <ConsultScreen
      testID="diagnostics-cart"
      title={k('diag.cart.titleCount', { n: num(itemCount) })}
      onBack={goBackDiag}
      footer={footer}
      actions={[{ key: 'clear', label: k('diag.cart.clear'), icon: <Glyph name="trash" size={20} color={c.icon.primary} />, onPress: () => void clearCart() }]}
    >
      <Section title={k('diag.cart.added')}>
        <Block gap={14}>
          {items.map((item, i) => (
            <View key={`${item.id}-${item.kind}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: i === items.length - 1 ? 0 : 14, borderBottomWidth: i === items.length - 1 ? 0 : 1, borderBottomColor: c.border.hairline }}>
              <FIcon icon={item.kind === 'radiology' ? 'scan' : 'test-tube'} tone={item.kind === 'radiology' ? RAD_TONE : LAB_TONE} size={44} theme={theme} />
              <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
                <Text style={{ ...scale(t, 'small', 'bold'), color: c.text.primary, ...flow }}>{item.name}</Text>
                <AmountLine label={k('diag.cart.price')} amount={item.price} />
              </View>
              <Stepper
                theme={theme}
                value={item.qty}
                min={0}
                label={item.name}
                decrementLabel={k('diag.cart.less')}
                incrementLabel={k('diag.cart.more')}
                format={(v) => num(v)}
                onChange={(v) => void (v <= 0 ? removeItem(item.id, item.kind) : updateQty(item.id, item.kind, v - item.qty))}
              />
            </View>
          ))}
        </Block>
      </Section>

      <Section title={k('diag.place.group')}>
        <Segmented
          theme={theme}
          label={k('diag.place.group')}
          value={serviceType}
          onChange={(v) => setServiceType(v === 'clinic' ? 'clinic' : 'home')}
          options={[
            { value: 'home', label: k('diag.place.homeLab') },
            { value: 'clinic', label: k('diag.place.visitLab') },
          ]}
        />
      </Section>

      <Section title={k('diag.cart.labs')}>
        <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{k('diag.cart.labsHint')}</Text>
        {loadingLabs ? <View accessibilityLabel={k('consult.loading')} accessibilityState={{ busy: true }} style={{ height: 96, borderRadius: 24, backgroundColor: c.bg.surface, borderWidth: 1, borderColor: c.border.hairline }} /> : null}
        {!loadingLabs
          ? compatibleLabs.map((lab) => (
              <LabCard
                key={lab.id}
                name={lab.name}
                line={[lab.rating !== null ? k('diag.rating', { n: num(lab.rating, { maximumFractionDigits: 1 }) }) : '', text.distance(lab.distance)].filter(Boolean).join(' · ')}
                tags={lab.homeVisit ? [{ label: k('diag.tag.home'), tone: 'neutral' }] : undefined}
                selected={selectedLab === lab.id}
                onPress={() => setSelectedLab(lab.id)}
              >
                <AmountLine label={k('diag.cart.labTotal')} amount={baseTotal} />
                <Text style={{ ...scale(t, 'tag', 'regular'), color: c.text.secondary, ...flow }}>{k('diag.cart.providerConfirms')}</Text>
              </LabCard>
            ))
          : null}
        {!loadingLabs && compatibleLabs.length === 0 ? <Text style={{ ...scale(t, 'small', 'regular'), color: c.text.secondary, textAlign: 'center' }}>{k('diag.cart.noLabs')}</Text> : null}
      </Section>
    </ConsultScreen>
  );
}
