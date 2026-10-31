import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, Pressable } from 'react-native';
import { useTheme, useLang } from '../context';
import { I } from './icons';
import { SP, FS, FW, R } from '../constants';
import { AUTONYMS, LANGS, type Lang } from '../i18n';

/**
 * The language choice: all six languages, each written in its own script. `chips` shows them in place (settings);
 * `menu` shows the current one as a small button that opens the list (the sign-in header).
 */
export function LanguagePicker({ variant = 'chips' }: { variant?: 'chips' | 'menu' }) {
  const { theme } = useTheme();
  const { lang, set, t } = useLang();
  const [open, setOpen] = useState(false);

  const choose = (l: Lang) => { set(l); setOpen(false); };
  const option = (l: Lang) => {
    const on = l === lang;
    return (
      <TouchableOpacity key={l} onPress={() => choose(l)} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={AUTONYMS[l]}
        style={{ paddingHorizontal: SP.lg, paddingVertical: SP.sm, borderRadius: R.md, borderWidth: 1, borderColor: on ? theme.primary : theme.border, backgroundColor: on ? theme.primary : theme.surface2 }}>
        <Text style={{ color: on ? theme.textInv : theme.text, fontWeight: on ? FW.bold : FW.reg, fontSize: FS.md }}>{AUTONYMS[l]}</Text>
      </TouchableOpacity>
    );
  };

  if (variant === 'chips') {
    return (
      <View accessibilityLabel={t('language')} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SP.sm }}>
        {LANGS.map(option)}
      </View>
    );
  }
  return (
    <>
      <TouchableOpacity onPress={() => setOpen(true)} accessibilityRole="button" accessibilityLabel={t('language')}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: SP.md, height: 34, backgroundColor: theme.surface2, borderRadius: 17, borderWidth: 1, borderColor: theme.border }}>
        <I name="globe" size={14} color={theme.primary} />
        <Text style={{ color: theme.text, fontSize: FS.sm, fontWeight: FW.bold }}>{AUTONYMS[lang]}</Text>
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable onPress={() => setOpen(false)} style={{ flex: 1, justifyContent: 'center', padding: SP.xl, backgroundColor: theme.overlay }}>
          <Pressable style={{ backgroundColor: theme.surface, borderRadius: R.lg, padding: SP.lg, gap: SP.md }}>
            <Text style={{ color: theme.text, fontSize: FS.lg, fontWeight: FW.bold }}>{t('language')}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SP.sm }}>{LANGS.map(option)}</View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

export default LanguagePicker;
