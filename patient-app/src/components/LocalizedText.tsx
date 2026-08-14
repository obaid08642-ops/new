// LocalizedText preserves React Native Text props while translating direct string children through the central catalog.
import React from 'react';
import { Text as NativeText, type TextProps } from 'react-native';
import { useApp } from '../context/AppContext';
import { autoTranslate } from '../i18n';

export function LocalizedText({ children, ...props }: TextProps) {
  const { lang } = useApp();
  return <NativeText {...props}>{autoTranslate(children, lang)}</NativeText>;
}
