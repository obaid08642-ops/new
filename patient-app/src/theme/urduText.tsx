import React from 'react';
import { StyleSheet } from 'react-native';
import { urduStyle } from './urduFont';

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
  const Wrapped = React.forwardRef<unknown, { style?: StyleProp }>((props, ref) => {
    // Subscribed, so already-mounted text switches family when the font becomes ready (no remount).
    const s = React.useSyncExternalStore(subscribe, snapshot, snapshot);
    if (!(s.lang === 'ur' && s.ready)) return <Orig {...props} ref={ref} />;
    return <Orig {...props} style={urduStyle(props.style, flatten, s.lang, s.ready)} ref={ref} />;
  });
  Wrapped.displayName = `Urdu(${name})`;
  return Wrapped;
}

/**
 * Replaces `Text` and `TextInput` on the react-native module with wrappers that map the app families
 * to Nastaliq while ur is active. Called only from the ur branch, so other languages never run it.
 * Covers every screen and ui-native component that reads `Text`/`TextInput` from 'react-native' at
 * render time; not Animated.createAnimatedComponent(Text) built at import time, nor native chrome.
 */
export function installUrduText() {
  if (installed) return;
  installed = true;
  // require, not `import *`: Babel's namespace interop returns a copy, and we must patch the real module.
  const mod = require('react-native') as Record<string, unknown>;
  for (const name of ['Text', 'TextInput']) {
    const Wrapped = wrap(mod[name] as React.ComponentType<any>, name);
    Object.defineProperty(mod, name, { configurable: true, enumerable: true, get: () => Wrapped });
  }
}
