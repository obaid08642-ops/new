import React from 'react';
import { StyleSheet } from 'react-native';
import { urduStyle } from './urduFont';

export const DEFAULT_FAMILY = { 300: 'ReadexPro-300', 400: 'ReadexPro-400', 500: 'ReadexPro-500', 700: 'ReadexPro-700' } as const;

/** The Readex Pro face for a CSS fontWeight (600 resolves to 500, 700 and up to 700: the family ships 300/400/500/700). */
export function readexFamilyFor(weight: unknown): string {
  if (weight === 'bold') return DEFAULT_FAMILY[700];
  const n = Number(weight);
  if (!Number.isFinite(n)) return DEFAULT_FAMILY[400];
  return n >= 700 ? DEFAULT_FAMILY[700] : n >= 500 ? DEFAULT_FAMILY[500] : n > 0 && n <= 300 ? DEFAULT_FAMILY[300] : DEFAULT_FAMILY[400];
}

/** True inside a Text: a nested Text inherits its parent's family, so it must not get a default of its own. */
const InsideText = React.createContext(false);

// Module state read by the Text/TextInput wrappers. Set by useUrduFont only.
let state = { lang: '', ready: false };
let installed = false;
const listeners = new Set<() => void>();
const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => void listeners.delete(fn);
};
const snapshot = () => state;

export function setUrduState(lang: string, ready: boolean) {
  if (state.lang === lang && state.ready === ready) return;
  state = { lang, ready };
  listeners.forEach((fn) => fn());
}

type StyleProp = Parameters<typeof StyleSheet.flatten>[0];
const flatten = (s: StyleProp) => StyleSheet.flatten(s) as never;

function wrap(Orig: React.ComponentType<any>, name: string) {
  const Wrapped = React.forwardRef<unknown, { style?: StyleProp; children?: React.ReactNode }>((props, ref) => {
    // Subscribed, so already-mounted text switches family when the font becomes ready (no remount).
    const s = React.useSyncExternalStore(subscribe, snapshot, snapshot);
    const inside = React.useContext(InsideText);
    let style = props.style;
    if (!inside) {
      // A top-level Text/TextInput with no fontFamily would draw in the device's system font (on a phone set to
      // Urdu that is Nastaliq, even for Arabic text). Give it the app face of its weight, in every language.
      const flat = flatten(style) as { fontFamily?: string; fontWeight?: unknown } | undefined;
      if (!flat?.fontFamily) style = { ...(flat ?? {}), fontFamily: readexFamilyFor(flat?.fontWeight), fontWeight: 'normal' } as never;
    }
    if (s.lang === 'ur' && s.ready) style = urduStyle(style, flatten, s.lang, s.ready);
    const node = <Orig {...props} style={style} ref={ref} />;
    return name === 'Text' ? <InsideText.Provider value>{node}</InsideText.Provider> : node;
  });
  Wrapped.displayName = `AppFont(${name})`;
  return Wrapped;
}

/**
 * Replaces `Text` and `TextInput` on the react-native module with wrappers that (1) give every text with no
 * fontFamily the Readex Pro face of its weight, in every language and inside every Modal/sheet (module-level, so it
 * does not depend on a context or an ancestor), and (2) map the app families to Nastaliq while ur is active.
 * Called once from app/_layout.tsx at import time.
 * Covers every screen and ui-native component that reads `Text`/`TextInput` from 'react-native' at
 * render time; not Animated.createAnimatedComponent(Text) built at import time, nor native chrome.
 */
export function installAppText() {
  if (installed) return;
  installed = true;
  // require, not `import *`: Babel's namespace interop returns a copy, and we must patch the real module.
  const mod = require('react-native') as Record<string, unknown>;
  for (const name of ['Text', 'TextInput']) {
    const Wrapped = wrap(mod[name] as React.ComponentType<any>, name);
    Object.defineProperty(mod, name, { configurable: true, enumerable: true, get: () => Wrapped });
  }
}

/** Kept for the ur loader: installing twice is a no-op. */
export const installUrduText = installAppText;
