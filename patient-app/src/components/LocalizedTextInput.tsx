// LocalizedTextInput translates only user-visible placeholder text and preserves native input behavior and props.
import React from 'react';
import { TextInput as NativeTextInput, type TextInputProps } from 'react-native';
import { useApp } from '../context/AppContext';
import { autoTranslate } from '../i18n';

export function LocalizedTextInput({ placeholder, ...props }: TextInputProps) {
  const { lang } = useApp();
  return <NativeTextInput {...props} placeholder={typeof placeholder === 'string' ? autoTranslate(placeholder, lang) : placeholder} />;
}
