import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';

import { Avatar, Button, Card, FIcon, type FillIconName, type ServiceTone } from '../../../../packages/ui-native/src';
import { Panel, Row, bodyOf, rowsOf } from '../health/HealthKit';
import { step as scale, useScreenUi } from '../screen/ScreenKit';
import { useGuestGuard } from '../../hooks/useGuestGuard';
import { logout } from '../../store/slices/authSlice';
import { apiFetch } from '../../utils/api';
import { logError } from '../../utils/logger';
import { AccountScreen } from './AccountKit';

/**
 * Profile (board Account): the account summary with "Edit" (the medical profile), the three quick links (orders, appointments, points),
 * the rows with a real count or name (addresses GET /users/me/addresses, family GET /family/members, insurance GET /user/insurance),
 * the settings, support and privacy rows, and sign out. The points come from GET /loyalty/account. A line that could not be read is
 * left out; nothing is guessed. Guests see the sign-in card instead of the summary and cannot open family or insurance.
 */

interface AuthUser { name?: string; full_name?: string; email?: string; phone?: string }

interface Counts { points: number | null; addresses: number | null; family: number | null; insurance: string | null }
const NONE: Counts = { points: null, addresses: null, family: null, insurance: null };

export function AccountView() {
  const { k, theme, t, c, flow, num } = useScreenUi();
  const dispatch = useDispatch();
  const { isGuest, requireAuth } = useGuestGuard();
  const user = useSelector((state: { auth: { user: AuthUser | null } }) => state.auth.user);
  const [counts, setCounts] = useState<Counts>(NONE);

  useEffect(() => {
    if (isGuest) return;
    let alive = true;
    (async () => {
      const [points, addresses, family, insurance] = await Promise.allSettled([apiFetch('/loyalty/account'), apiFetch('/users/me/addresses'), apiFetch('/family/members'), apiFetch('/user/insurance')]);
      if (!alive) return;
      const failed = [points, addresses, family, insurance].filter((r) => r.status === 'rejected');
      if (failed.length) logError('account:summary', (failed[0] as PromiseRejectedResult).reason);
      const pts = points.status === 'fulfilled' ? Number(bodyOf<{ points?: unknown }>(points.value).points) : NaN;
      const provider = insurance.status === 'fulfilled' ? bodyOf<{ provider?: unknown }>(insurance.value).provider : null;
      setCounts({
        points: Number.isFinite(pts) ? pts : null,
        addresses: addresses.status === 'fulfilled' ? rowsOf(addresses.value).length : null,
        family: family.status === 'fulfilled' ? rowsOf(family.value).length : null,
        insurance: typeof provider === 'string' && provider ? provider : null,
      });
    })();
    return () => {
      alive = false;
    };
  }, [isGuest]);

  const name = user?.name || user?.full_name || '';
  const line = user?.email || user?.phone || '';
  const go = (route: string) => () => router.push(route as Href);
  const guarded = (route: string, feature: string) => () => {
    if (isGuest && requireAuth(feature)) return;
    router.push(route as Href);
  };
  const signOut = () => {
    dispatch(logout());
    router.replace('/(auth)/welcome' as Href);
  };

  const quick: { icon: FillIconName; tone: ServiceTone; label: string; value?: string; route: string; testID: string }[] = [
    { icon: 'receipt', tone: 'coral', label: k('account.orders'), route: '/orders', testID: 'account-orders' },
    { icon: 'calendar-dots', tone: 'blue', label: k('account.appointments'), route: '/consultations/appointments', testID: 'account-appointments' },
    { icon: 'star', tone: 'amber', label: k('account.points'), value: counts.points === null ? undefined : num(counts.points), route: '/loyalty/hub', testID: 'account-points' },
  ];

  return (
    <AccountScreen title={k('account.title')} fallback={'/(tabs)' as Href} testID="profile-screen">
      {isGuest ? (
        <Card theme={theme}>
          <View style={{ alignItems: 'center', gap: 10 }}>
            <FIcon icon="user-circle" tone="blue" size={56} theme={theme} />
            <Text accessibilityRole="header" style={{ ...scale(t, 'bodyStrong'), color: c.text.primary, textAlign: 'center' }}>{k('account.guestTitle')}</Text>
            <Text style={{ ...scale(t, 'small', 'regular'), color: c.text.secondary, textAlign: 'center' }}>{k('account.guestBody')}</Text>
            <Button label={k('account.guestAction')} size="lg" fullWidth onPress={signOut} theme={theme} testID="account-sign-in" />
          </View>
        </Card>
      ) : (
        <Card theme={theme}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Avatar name={name || k('account.title')} size="md" theme={theme} />
            <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
              <Text style={{ ...scale(t, 'bodyStrong'), color: c.text.primary, ...flow }}>{name || k('account.unnamed')}</Text>
              {line ? <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, writingDirection: 'ltr', textAlign: flow.textAlign }}>{line}</Text> : null}
            </View>
            <Button label={k('account.edit')} variant="outline" size="sm" onPress={go('/health/profile')} theme={theme} testID="account-edit" />
          </View>
        </Card>
      )}

      <View style={{ flexDirection: 'row', gap: 10 }}>
        {quick.map((item) => (
          <Pressable key={item.testID} accessibilityRole="button" accessibilityLabel={[item.label, item.value].filter(Boolean).join(', ')} onPress={go(item.route)} testID={item.testID} style={({ pressed }) => ({ flex: 1, opacity: pressed ? 0.85 : 1 })}>
            <Card theme={theme}>
              <View style={{ alignItems: 'center', gap: 8, minHeight: 84, justifyContent: 'center' }}>
                <FIcon icon={item.icon} tone={item.tone} chip="soft" size={40} theme={theme} />
                <Text numberOfLines={2} style={{ ...scale(t, 'meta', 'medium'), color: c.text.primary, textAlign: 'center' }}>{item.label}</Text>
                {item.value ? <Text style={{ ...scale(t, 'tag', 'bold'), color: c.text.secondary }}>{item.value}</Text> : null}
              </View>
            </Card>
          </Pressable>
        ))}
      </View>

      <Panel testID="account-rows">
        <Row icon="map-pin-line" tone="coral" title={k('account.addresses')} subtitle={counts.addresses === null ? undefined : k('account.addressCount', { n: counts.addresses })} onPress={go('/profile/addresses')} testID="account-addresses" />
        <Row icon="users-three" tone="peach" title={k('account.family')} subtitle={counts.family === null ? undefined : k('account.familyCount', { n: counts.family })} onPress={guarded('/family', 'family')} testID="account-family" />
        <Row icon="shield-check" tone="teal" title={k('account.insurance')} subtitle={counts.insurance ?? undefined} onPress={guarded('/profile/insurance', 'insurance')} last testID="account-insurance" />
      </Panel>
      <Panel testID="account-settings-rows">
        <Row icon="gear" tone="ink" title={k('account.settings')} subtitle={k('account.settingsHint')} onPress={go('/settings')} testID="account-settings" />
        <Row icon="headset" tone="mint" title={k('account.support')} onPress={go('/settings/help')} testID="account-support" />
        <Row icon="lock" tone="violet" title={k('account.privacy')} onPress={go('/settings/privacy')} last testID="account-privacy" />
      </Panel>
      {isGuest ? null : <Button label={k('set.signOut')} variant="outline" size="lg" fullWidth startIcon="sign-out" onPress={signOut} theme={theme} testID="account-sign-out" />}
    </AccountScreen>
  );
}
