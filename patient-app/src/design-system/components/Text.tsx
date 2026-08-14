/**
 * DS Text — Premium RTL-first typography component.
 * Replaces raw <Text> and the old AppText in ui.tsx.
 * Uses Cairo font family from the design system.
 */
import React from 'react';
import { Text, TextProps, StyleSheet } from 'react-native';
import { useApp } from '../../context/AppContext';
import { autoTranslate } from '../../i18n';
import { Typography, getTextAlign } from '../tokens';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
export type TextVariant = keyof typeof Typography;

export interface DSTextProps extends Omit<TextProps, 'style'> {
  variant?: TextVariant;
  color?: string;
  align?: 'left' | 'right' | 'center' | 'auto';
  style?: TextProps['style'];
  /** Prevent dynamic type scaling (use sparingly) */
  noScale?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
export function DSText({
  variant = 'bodyMD',
  color,
  align = 'auto',
  style,
  noScale = false,
  children,
  ...rest
}: DSTextProps) {
  const { lang, colors } = useApp();
  const isRTL = lang === 'ar' || lang === 'ur';

  const resolvedAlign =
    align === 'auto'
      ? isRTL ? 'right' : 'left'
      : align;

  const typeStyle = Typography[variant];

  return (
    <Text
      allowFontScaling={!noScale}
      maxFontSizeMultiplier={1.5}
      style={[
        typeStyle,
        {
          color: color ?? colors.textPrimary,
          textAlign: resolvedAlign,
          writingDirection: isRTL ? 'rtl' : 'ltr',
        },
        style,
      ]}
      {...rest}
    >
      {autoTranslate(children, lang)}
    </Text>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Convenience shortcuts
// ─────────────────────────────────────────────────────────────────────────────
export const DSTitle = (props: DSTextProps) => (
  <DSText variant="h3" {...props} />
);

export const DSCaption = (props: DSTextProps) => (
  <DSText variant="caption" {...props} />
);

export const DSLabel = (props: DSTextProps) => (
  <DSText variant="labelMD" {...props} />
);
