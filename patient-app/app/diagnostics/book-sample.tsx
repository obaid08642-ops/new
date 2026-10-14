import React from 'react';
import { Text, View } from 'react-native';
import { router, type Href } from 'expo-router';

import { Button } from '../../../packages/ui-native/src';
import { ConsultScreen, Section } from '../../src/components/consult/ConsultKit';
import { Block, Mark, goBackDiag } from '../../src/components/diagnostics/DiagKit';
import { Notice } from '../../src/components/pharmacy/OfferKit';
import { step as scale, useScreenUi } from '../../src/components/screen/ScreenKit';
import { useDiagnosticsCart } from '../../src/context/DiagnosticsCartContext';

/** The legacy entry of a sample booking: it lists what is in the cart and sends the patient to the cart, where the lab is chosen (no order is made here). */
export default function BookSampleScreen() {
  const { theme, t, c, k, flow } = useScreenUi();
  const { items } = useDiagnosticsCart();
  return (
    <ConsultScreen
      testID="diagnostics-book-sample"
      title={k('diag.sample.title')}
      onBack={goBackDiag}
      footer={<Button theme={theme} size="lg" fullWidth startIcon="cart" label={k('diag.sample.toCart')} onPress={() => router.replace('/diagnostics/cart' as Href)} />}
    >
      <Notice tone="info" text={k('diag.sample.info')} />
      <Section title={k('diag.sample.tests')}>
        <Block gap={8}>
          {items.length > 0 ? (
            items.map((item, i) => (
              <View key={`${item.id}-${i}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 32 }}>
                <Mark kind="check" size={16} color={c.status.success.fg} />
                <Text style={{ flex: 1, minWidth: 0, ...scale(t, 'small', 'regular'), color: c.text.primary, ...flow }}>{item.name}</Text>
              </View>
            ))
          ) : (
            <Text style={{ ...scale(t, 'small', 'regular'), color: c.text.secondary, ...flow }}>{k('diag.sample.empty')}</Text>
          )}
        </Block>
      </Section>
      <Section title={k('diag.sample.next')}>
        <Text style={{ ...scale(t, 'small', 'regular'), lineHeight: 22, color: c.text.secondary, ...flow }}>{k('diag.sample.nextBody')}</Text>
      </Section>
    </ConsultScreen>
  );
}
