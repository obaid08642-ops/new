import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { type Href } from 'expo-router';

import { Avatar, FIcon, Toggle, type FillIconName, type ServiceTone } from '../../../../packages/ui-native/src';
import { Chevron, goBack } from '../consult/ConsultKit';
import { HealthScreen, Panel, Pill, rowsOf } from '../health/HealthKit';
import { step as scale, useScreenUi } from '../screen/ScreenKit';
import { apiFetch } from '../../utils/api';

/**
 * What the Family screens share (Batch 6): the screen frame, the member row of the board (an initials disc, the name,
 * the relation, a pill and a chevron), the permission list with its switches, and the load of the family group. A
 * screen holds no colour, no font size and no sentence.
 */

export const FAMILY_HUB = '/family' as Href;
export const FAMILY_ADD = '/family/add';

/** The frame of a family screen: the board header, back to the family hub when there is nothing to go back to. */
export function FamilyScreen(props: React.ComponentProps<typeof HealthScreen>) {
  return <HealthScreen {...props} onBack={props.onBack ?? (() => goBack(FAMILY_HUB))} />;
}

export interface FamilyMember {
  user_id: string;
  display_name?: string | null;
  role?: string | null;
  relation?: string | null;
  joined_at?: string | null;
  permissions?: string[];
}

export interface FamilyGroup {
  id?: string;
  name?: string;
  members?: FamilyMember[];
}

/**
 * GET /family/my-group and GET /family/members. "No family group found" is a normal answer (the person has no group
 * yet): it returns `group: null`; any other failure is thrown so the screen shows its retry state.
 */
export async function loadFamily(): Promise<{ group: FamilyGroup | null; members: FamilyMember[] }> {
  let group: FamilyGroup | null;
  try {
    group = ((await apiFetch('/family/my-group')) as FamilyGroup | null) ?? null;
  } catch (e) {
    if (String((e as { message?: unknown } | null)?.message ?? '').toLowerCase().includes('no family group found')) return { group: null, members: [] };
    throw e;
  }
  if (!group) return { group: null, members: [] };
  return { group, members: rowsOf<FamilyMember>(await apiFetch('/family/members')) };
}

/** The permissions of the API (`permissions` of /family/my-group and the body of /family/member/:id/permissions), each with its glyph. */
export const PERMISSIONS: { key: string; icon: FillIconName; tone: ServiceTone }[] = [
  { key: 'vitals', icon: 'heartbeat', tone: 'peach' },
  { key: 'meds', icon: 'pill', tone: 'mint' },
  { key: 'reports', icon: 'file-text', tone: 'blue' },
  { key: 'appointments', icon: 'calendar-dots', tone: 'coral' },
  { key: 'booking', icon: 'stethoscope', tone: 'teal' },
  { key: 'pharmacy', icon: 'storefront', tone: 'violet' },
  { key: 'payment', icon: 'credit-card', tone: 'amber' },
  { key: 'location', icon: 'map-pin', tone: 'pink' },
  { key: 'emergency', icon: 'bell', tone: 'coral' },
];

/** The name of a permission in the screen's language; a permission this app does not know is shown as the server sent it. */
export function permissionLabel(k: (key: string) => string, key: string): string {
  return PERMISSIONS.some((p) => p.key === key) ? k(`family.perm.${key}`) : key;
}

/** Every permission as a row with its glyph, its line and a switch; `onToggle` gets the key. */
export function PermissionList({ granted, onToggle, disabled = false, testID }: { granted: string[]; onToggle: (key: string) => void; disabled?: boolean; testID?: string }) {
  const { theme, t, c, flow, k } = useScreenUi();
  return (
    <Panel testID={testID}>
      {PERMISSIONS.map((p, i) => (
        <View key={p.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14, minHeight: 64, borderBottomWidth: i === PERMISSIONS.length - 1 ? 0 : 1, borderBottomColor: c.border.hairline }}>
          <FIcon icon={p.icon} tone={p.tone} size={40} chip="soft" theme={theme} />
          <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
            <Text style={{ ...scale(t, 'body', 'bold'), color: c.text.primary, ...flow }}>{k(`family.perm.${p.key}`)}</Text>
            <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{k(`family.perm.${p.key}.hint`)}</Text>
          </View>
          <Toggle label={k(`family.perm.${p.key}`)} value={granted.includes(p.key)} onChange={() => onToggle(p.key)} disabled={disabled} theme={theme} testID={`${testID ?? 'perm'}-${p.key}`} />
        </View>
      ))}
    </Panel>
  );
}

/** A member of the board's list: an initials disc, the name, the relation, an optional pill and a chevron. */
export function MemberRow({ name, relation, pill, last = false, onPress, testID }: { name: string; relation?: string; pill?: { label: string; tone: 'success' | 'info' | 'neutral' }; last?: boolean; onPress: () => void; testID?: string }) {
  const { theme, t, c, flow } = useScreenUi();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={[name, relation, pill?.label].filter(Boolean).join(', ')} onPress={onPress} testID={testID} style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14, minHeight: 72, borderBottomWidth: last ? 0 : 1, borderBottomColor: c.border.hairline }}>
        <Avatar name={name} size="md" theme={theme} />
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <Text style={{ ...scale(t, 'body', 'bold'), color: c.text.primary, ...flow }}>{name}</Text>
          {relation ? <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{relation}</Text> : null}
        </View>
        {pill ? <Pill label={pill.label} tone={pill.tone} /> : null}
        <Chevron />
      </View>
    </Pressable>
  );
}
