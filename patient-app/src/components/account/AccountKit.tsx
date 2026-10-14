import React, { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { type Href } from 'expo-router';

import { Toggle } from '../../../../packages/ui-native/src';
import { ConsultScreen, goBack } from '../consult/ConsultKit';
import { Glyph } from '../pharmacy/PharmacyKit';
import { bodyOf, useRemote } from '../health/HealthKit';
import { step as scale, useScreenUi } from '../screen/ScreenKit';
import { apiFetch } from '../../utils/api';
import { logError } from '../../utils/logger';

/**
 * What the Settings, Account, Support and Returns screens share (Batch 12): the screen frame whose back button
 * returns to the settings hub, a switch row with its hint, a row of flags that saves each change at once (and puts
 * the switch back, with a message, when the save fails), and the star input of the review forms. A screen holds no
 * colour, no font size and no sentence.
 */

export const SETTINGS_HOME = '/settings' as Href;

/** The frame of a settings or account screen: the board header, back to `fallback` (the settings hub) when there is nothing to go back to. */
export function AccountScreen(props: Omit<React.ComponentProps<typeof ConsultScreen>, 'onBack'> & { onBack?: () => void; fallback?: Href }) {
  const { fallback, onBack, ...rest } = props;
  return <ConsultScreen {...rest} onBack={onBack ?? (() => goBack(fallback ?? SETTINGS_HOME))} />;
}

/** A switch with its name and a line under it; `locked` rows are on and cannot be changed (the server requires them). */
export function ToggleRow({ label, hint, value, onChange, disabled = false, last = false, testID }: { label: string; hint?: string; value: boolean; onChange: (next: boolean) => void; disabled?: boolean; last?: boolean; testID?: string }) {
  const { theme, t, c, flow } = useScreenUi();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14, minHeight: 64, borderBottomWidth: last ? 0 : 1, borderBottomColor: c.border.hairline }}>
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text style={{ ...scale(t, 'body', 'bold'), color: c.text.primary, ...flow }}>{label}</Text>
        {hint ? <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{hint}</Text> : null}
      </View>
      <Toggle label={label} value={value} onChange={onChange} disabled={disabled} theme={theme} testID={testID} />
    </View>
  );
}

/**
 * A screen of on/off settings kept by the server: loads `path` once, and every change is sent at once as `PATCH path`
 * with just that flag. When the save fails the switch goes back and `failed` says so.
 */
export function useFlags(path: string, defaults: Record<string, boolean>, tag: string) {
  const [flags, setFlags] = useState<Record<string, boolean>>(defaults);
  const [failed, setFailed] = useState(false);
  const remote = useRemote(async () => {
    const stored = bodyOf<Record<string, unknown>>(await apiFetch(path));
    setFlags((current) => {
      const next = { ...current };
      for (const key of Object.keys(defaults)) if (typeof stored[key] === 'boolean') next[key] = stored[key] as boolean;
      return next;
    });
    return true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path], tag);
  const toggle = useCallback(
    async (key: string, value: boolean) => {
      setFailed(false);
      setFlags((current) => ({ ...current, [key]: value }));
      try {
        await apiFetch(path, { method: 'PATCH', body: JSON.stringify({ [key]: value }) });
      } catch (error) {
        logError(tag, error);
        setFlags((current) => ({ ...current, [key]: !value }));
        setFailed(true);
      }
    },
    [path, tag],
  );
  return { flags, toggle, failed, status: remote.status, reload: remote.reload };
}

/** Five stars as a rating input (fill glyph, amber of the points tone for the chosen ones, the strong hairline for the rest). */
export function StarRating({ value, onChange, label, size = 32, testID }: { value: number; onChange: (next: number) => void; label: string; size?: number; testID?: string }) {
  const { c, k } = useScreenUi();
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} testID={testID} style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Pressable
          key={star}
          accessibilityRole="radio"
          accessibilityLabel={k('account.stars', { n: star })}
          accessibilityState={{ checked: star === value }}
          onPress={() => onChange(star)}
          hitSlop={4}
          style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
        >
          <Glyph name="star" size={size} color={star <= value ? c.service.amber.fg : c.border.strong} />
        </Pressable>
      ))}
    </View>
  );
}
