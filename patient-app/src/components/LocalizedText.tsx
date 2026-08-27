import React from 'react';
import { Text, TextProps } from 'react-native';
import { useApp } from '../context/AppContext';
import { autoTranslate } from '../i18n';

/**
 * Applies the central six-language phrase catalog to direct React Native Text
 * children while preserving non-string children such as icons, variables, and
 * formatted JSX fragments exactly as rendered by their parent screen.
 */
export function LocalizedText({ children, ...props }: TextProps) {
  const { lang } = useApp();
  const localizedChildren = React.Children.map(children, (child) =>
    typeof child === 'string' ? autoTranslate(child, lang) : child,
  );
  return <Text {...props}>{localizedChildren}</Text>;
}
