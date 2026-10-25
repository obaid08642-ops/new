import React from 'react';
import { Text, View } from 'react-native';

import { Pill } from './PharmacyKit';
import { step as scale, useScreenUi } from '../screen/ScreenKit';
import { isIxNote, ixLevel, type IxResult } from '../../utils/interactionCheck';

/** The verdict, one row per interaction and the advisory line of POST /ai/drug-interactions (shared by the scanner and the typed check). */
export function InteractionResult({ result }: { result: IxResult }) {
  const { t, c, flow, k, lang } = useScreenUi();
  return (
    <View accessibilityLiveRegion="polite" style={{ gap: 8, paddingTop: 12, borderTopWidth: 1, borderColor: c.border.subtle }}>
      <Text accessibilityRole="header" style={{ ...scale(t, 'bodyStrong'), color: c.text.primary, ...flow }}>{result.safe ? k('pharmacy.scan.ixSafe') : k('pharmacy.scan.ixAttention')}</Text>
      {(result.interactions || []).map((h, i) => {
        const level = ixLevel(h.severity);
        // The note is translated from its code; the Arabic server sentence is never shown in another language.
        const note = h.code && isIxNote(h.code) ? k(`pharmacy.scan.ix.${h.code}`) : lang === 'ar' ? h.note_ar || h.note : h.note;
        return (
          <View key={`${h.severity}-${i}`} style={{ gap: 4 }}>
            {level ? <Pill label={k(level.key)} tone={level.tone} /> : null}
            {note ? <Text style={{ ...scale(t, 'small', 'regular'), color: c.text.secondary, ...flow }}>{note}</Text> : null}
          </View>
        );
      })}
      <Text style={{ ...scale(t, 'caption', 'regular'), color: c.text.secondary, ...flow }}>{k('pharmacy.scan.ixAdvisory')}</Text>
    </View>
  );
}
