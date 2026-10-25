import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { AppHeader, Button, Icon, Input, Screen } from '../../../packages/ui-native/src';
import { InteractionResult } from '../../src/components/pharmacy/InteractionResult';
import { goBack } from '../../src/components/pharmacy/PharmacyKit';
import { COLUMN, step as scale, useScreenUi } from '../../src/components/screen/ScreenKit';
import { apiFetch } from '../../src/utils/api';
import { addDrug, type IxResult } from '../../src/utils/interactionCheck';
import { logError } from '../../src/utils/logger';

/**
 * Check the interactions between several medicines (web parity: /pharmacy/barcode's checker). The patient types the medicines
 * they take, one at a time; "Check" posts the whole list to POST /ai/drug-interactions and the verdict is drawn as on the scanner.
 */
export default function InteractionsScreen() {
  const { theme, t, c, dir, flow, k } = useScreenUi();
  const [input, setInput] = useState('');
  const [drugs, setDrugs] = useState<string[]>([]);
  const [state, setState] = useState<'idle' | 'busy' | 'error' | 'done'>('idle');
  const [result, setResult] = useState<IxResult | null>(null);

  const add = () => {
    setDrugs((list) => addDrug(list, input));
    setInput('');
    setState('idle');
    setResult(null);
  };
  const remove = (name: string) => {
    setDrugs((list) => list.filter((d) => d !== name));
    setState('idle');
    setResult(null);
  };
  const check = async () => {
    if (!drugs.length || state === 'busy') return;
    setState('busy');
    setResult(null);
    try {
      setResult(await apiFetch<IxResult>('/ai/drug-interactions', { method: 'POST', body: JSON.stringify({ drugs }) }));
      setState('done');
    } catch (e) {
      logError('pharmacy:interactions:check', e);
      setState('error');
    }
  };

  return (
    <Screen
      theme={theme}
      direction={dir}
      scroll
      header={<View style={COLUMN}><AppHeader title={k('pharmacy.ix.title')} onBack={goBack} backLabel={k('pharmacy.back')} theme={theme} direction={dir} /></View>}
      testID="interactions-screen"
    >
      <View style={{ ...COLUMN, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 40, gap: 16 }}>
        <Text style={{ ...scale(t, 'label', 'regular'), color: c.text.secondary, ...flow }}>{k('pharmacy.ix.intro')}</Text>
        <Input label={k('pharmacy.ix.drug')} placeholder={k('pharmacy.ix.drug')} value={input} onChange={setInput} theme={theme} testID="ix-input" />
        <Button label={k('pharmacy.ix.add')} variant="secondary" fullWidth disabled={input.trim().length < 2} onPress={add} theme={theme} testID="ix-add" />
        {drugs.length > 0 ? (
          <View accessibilityLabel={k('pharmacy.ix.list')} style={{ gap: 8 }}>
            {drugs.map((d) => (
              <View key={d} style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingStart: 14, borderWidth: 1, borderColor: c.border.subtle, borderRadius: 12, backgroundColor: c.bg.surface }}>
                <Text style={{ flex: 1, ...scale(t, 'bodyStrong'), color: c.text.primary, ...flow }}>{d}</Text>
                <Pressable accessibilityRole="button" accessibilityLabel={k('pharmacy.ix.remove', { name: d })} onPress={() => remove(d)} hitSlop={4} style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="close" size={20} theme={theme} />
                </Pressable>
              </View>
            ))}
          </View>
        ) : null}
        <Button label={state === 'busy' ? k('pharmacy.scan.ixChecking') : k('pharmacy.ix.check')} size="lg" fullWidth loading={state === 'busy'} disabled={!drugs.length} onPress={() => void check()} theme={theme} testID="ix-check" />
        {!drugs.length && state === 'idle' ? <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{k('pharmacy.ix.needOne')}</Text> : null}
        {state === 'error' ? <Text accessibilityRole="alert" style={{ ...scale(t, 'meta', 'regular'), color: c.status.danger.fg, ...flow }}>{k('pharmacy.scan.ixFailed')}</Text> : null}
        {state === 'done' && result ? <InteractionResult result={result} /> : null}
      </View>
    </Screen>
  );
}
