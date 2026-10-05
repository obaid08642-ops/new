import * as React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type RefreshControlProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { resolveDirection, shellTokens, type Direction, type ThemeName } from './shellTokens';

/**
 * <Screen> — DEVICE_STANDARD §1: the one wrapper every native screen uses, so no
 * screen does its own inset math.
 *
 *  - insets come from react-native-safe-area-context, never RN's SafeAreaView;
 *  - `edges` says which insets the screen itself pads. The top inset belongs to
 *    the header when there is one, and the bottom inset to the footer or the tab
 *    bar when there is one, so by default the screen pads whatever is left;
 *  - `keyboard` wraps the body in a KeyboardAvoidingView (iOS `padding`, Android
 *    `height`) and taps are kept while the keyboard is up, so the focused field
 *    and the primary button are never hidden (§3.5);
 *  - `scroll` makes the body a ScrollView and tells a function `header` when the
 *    content has scrolled under it (the header turns to glass then);
 *  - the background is the canvas token unless `background` overrides it.
 */

export type Edge = 'top' | 'bottom' | 'start' | 'end';

export interface ScreenProps {
  children: React.ReactNode;
  header?: React.ReactNode | ((state: { scrolled: boolean }) => React.ReactNode);
  footer?: React.ReactNode;
  edges?: Edge[];
  scroll?: boolean;
  keyboard?: boolean;
  background?: string;
  /** Extra space at the end of the scroll content, e.g. useTabBarHeight() under a floating tab bar. */
  bottomSpace?: number;
  refreshControl?: React.ReactElement<RefreshControlProps>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  theme?: ThemeName;
  direction?: Direction;
  testID?: string;
}

export function Screen({
  children,
  header,
  footer,
  edges,
  scroll = false,
  keyboard = false,
  background,
  bottomSpace = 0,
  refreshControl,
  contentContainerStyle,
  theme = 'light',
  direction,
  testID,
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  const t = shellTokens(theme);
  const dir = resolveDirection(direction);
  const [scrolled, setScrolled] = React.useState(false);

  const pad = new Set<Edge>(edges ?? [...(header ? [] : (['top'] as Edge[])), ...(footer ? [] : (['bottom'] as Edge[])), 'start', 'end']);
  const physicalStart = dir === 'rtl' ? insets.right : insets.left;
  const physicalEnd = dir === 'rtl' ? insets.left : insets.right;
  const bodyPadding: ViewStyle = {
    paddingTop: pad.has('top') ? insets.top : 0,
    paddingStart: pad.has('start') ? physicalStart : 0,
    paddingEnd: pad.has('end') ? physicalEnd : 0,
  };
  const endPadding = (pad.has('bottom') ? insets.bottom : 0) + bottomSpace;

  const onScroll = React.useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = e.nativeEvent.contentOffset.y > 4;
    setScrolled((prev) => (prev === next ? prev : next));
  }, []);

  const body = scroll ? (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={[bodyPadding, { paddingBottom: endPadding, flexGrow: 1 }, contentContainerStyle]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      onScroll={typeof header === 'function' ? onScroll : undefined}
      scrollEventThrottle={16}
      refreshControl={refreshControl}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[{ flex: 1 }, bodyPadding, { paddingBottom: endPadding }, contentContainerStyle]}>{children}</View>
  );

  return (
    <View testID={testID} style={{ flex: 1, backgroundColor: background ?? t.canvas }}>
      {typeof header === 'function' ? header({ scrolled }) : header}
      {keyboard ? (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          {body}
          {footer}
        </KeyboardAvoidingView>
      ) : (
        <>
          {body}
          {footer}
        </>
      )}
    </View>
  );
}
