import * as React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { HIT, SHELL_FONT, resolveDirection, shellTokens, type Direction, type ThemeName } from './shellTokens';

/**
 * <AppHeader> — DEVICE_STANDARD §1: a 44 pt bar below the top inset (notch,
 * Dynamic Island, Android status bar), glass only once the content has scrolled
 * under it, and a back chevron that points the way the reader goes back (left in
 * LTR, right in RTL).
 *
 * Geometry from canvas/Settings.dc.html: a 44×44 round back button with a hairline
 * ring on the surface colour, a centred 19/700 title, and a 44-wide balance on the
 * other side so the title stays centred.
 */

export interface AppHeaderAction {
  key: string;
  /** Accessible name; required because the button only shows an icon. */
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
}

export interface AppHeaderProps {
  title?: string;
  /** Shows the back button when set. */
  onBack?: () => void;
  /** Accessible name of the back button, in the screen's language. */
  backLabel?: string;
  actions?: AppHeaderAction[];
  /**
   * A text action in place of the 44-wide balance (canvas/Notifications.dc.html: "قراءة الكل" at the end of the
   * header). The caller draws it, at least 44 tall, and names it; icon actions use `actions`.
   */
  trailing?: React.ReactNode;
  /** Content has scrolled under the header: switch to the glass background. */
  scrolled?: boolean;
  theme?: ThemeName;
  direction?: Direction;
  testID?: string;
}

const CHEVRON = { ltr: 'M15 6l-6 6 6 6', rtl: 'M9 6l6 6-6 6' } as const;

export function AppHeader({ title, onBack, backLabel = 'Back', actions = [], trailing, scrolled = false, theme = 'light', direction, testID }: AppHeaderProps) {
  const insets = useSafeAreaInsets();
  const t = shellTokens(theme);
  const dir = resolveDirection(direction);

  const roundButton = {
    width: HIT,
    height: HIT,
    borderRadius: HIT / 2,
    borderWidth: 1,
    borderColor: t.hairline,
    backgroundColor: t.surface,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  };

  return (
    <View
      testID={testID}
      accessibilityRole="header"
      style={{
        paddingTop: insets.top,
        paddingStart: t.space.sm + (dir === 'rtl' ? insets.right : insets.left),
        paddingEnd: t.space.sm + (dir === 'rtl' ? insets.left : insets.right),
        paddingBottom: t.space['2xs'],
        backgroundColor: scrolled ? t.glass : 'transparent',
        borderBottomWidth: scrolled ? 1 : 0,
        borderBottomColor: t.hairline,
        zIndex: t.zAppBar,
      }}
    >
      <View style={{ minHeight: HIT, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        {onBack ? (
          <Pressable accessibilityRole="button" accessibilityLabel={backLabel} onPress={onBack} hitSlop={4} style={roundButton}>
            <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
              <Path d={CHEVRON[dir]} stroke={t.text} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </Pressable>
        ) : (
          <View style={{ width: HIT }} />
        )}
        <Text
          accessibilityRole="header"
          numberOfLines={2}
          style={{ flex: 1, textAlign: 'center', fontSize: 19, lineHeight: 26, fontFamily: SHELL_FONT.bold, color: t.text }}
        >
          {title}
        </Text>
        {trailing ? (
          <View style={{ minWidth: HIT, minHeight: HIT, alignItems: 'center', justifyContent: 'center' }}>{trailing}</View>
        ) : actions.length ? (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {actions.map((a) => (
              <Pressable key={a.key} accessibilityRole="button" accessibilityLabel={a.label} onPress={a.onPress} hitSlop={4} style={roundButton}>
                {a.icon}
              </Pressable>
            ))}
          </View>
        ) : (
          <View style={{ width: HIT }} />
        )}
      </View>
    </View>
  );
}
