import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, StyleSheet, View } from 'react-native';
import { router, usePathname } from 'expo-router';

import { ErrorState, Screen } from '../../../packages/ui-native/src';
import { useScreenUi } from '../components/screen/ScreenKit';
import { BASE_URL } from '../utils/api';
import { NONE_DISABLED, isRouteHidden, parseDisabled, setModuleDisabledListener, type DisabledModules } from '../utils/moduleSwitches';

/**
 * Module switches (#953). GET /modules is public; it is read at launch and whenever the app returns to the
 * foreground, with a short cache so a burst of screens does not repeat it. If the call fails the last known
 * answer stays, and with none every module shows (a failed call never hides a service).
 */

const CACHE_MS = 60_000;
const TIMEOUT_MS = 6_000;

type Value = { disabled: DisabledModules; isHidden: (route: string | null | undefined) => boolean; refresh: () => Promise<void> };
const DEFAULT: Value = { disabled: NONE_DISABLED, isHidden: () => false, refresh: async () => undefined };
const ModulesContext = createContext<Value>(DEFAULT);

export function ModulesProvider({ children }: { children: React.ReactNode }) {
  const [disabled, setDisabled] = useState<DisabledModules>(NONE_DISABLED);
  const fetchedAt = useRef(0);

  const refresh = useCallback(async () => {
    if (Date.now() - fetchedAt.current < CACHE_MS) return;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const response = await fetch(`${BASE_URL}/modules`, { method: 'GET', headers: { Accept: 'application/json' }, signal: controller.signal });
      if (!response.ok) return;
      const next = parseDisabled(await response.json());
      fetchedAt.current = Date.now();
      setDisabled((prev) => (prev.size === next.size && [...next].every((key) => prev.has(key)) ? prev : next));
    } catch {
      // keep the last known answer; with none, everything shows
    } finally {
      clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const sub = AppState.addEventListener('change', (state) => { if (state === 'active') void refresh(); });
    return () => sub.remove();
  }, [refresh]);

  // the backend's own refusal (module_disabled:<key>) switches that module off at once
  useEffect(() => {
    setModuleDisabledListener((key) => setDisabled((prev) => (prev.has(key) ? prev : new Set([...prev, key]))));
    return () => setModuleDisabledListener(null);
  }, []);

  const value = useMemo<Value>(() => ({ disabled, isHidden: (route) => isRouteHidden(route, disabled), refresh }), [disabled, refresh]);
  return <ModulesContext.Provider value={value}>{children}</ModulesContext.Provider>;
}

export const useModules = (): Value => useContext(ModulesContext);

/**
 * A deep link, a push or a stale screen into a switched-off module shows a calm "service unavailable" state over
 * the navigator (the navigator stays mounted, so Back and Home keep working).
 */
export function ModuleRouteGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isHidden } = useModules();
  const { theme, k } = useScreenUi();
  const blocked = isHidden(pathname);
  return (
    <View style={{ flex: 1 }}>
      {children}
      {blocked ? (
        <View style={StyleSheet.absoluteFill} testID="module-unavailable">
          <Screen theme={theme} edges={['top', 'start', 'end', 'bottom']}>
            <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 16 }}>
              <ErrorState
                title={k('modules.unavailable.title')}
                body={k('modules.unavailable.body')}
                retryLabel={k('modules.unavailable.home')}
                onRetry={() => router.replace('/(tabs)')}
                theme={theme}
              />
            </View>
          </Screen>
        </View>
      ) : null}
    </View>
  );
}
