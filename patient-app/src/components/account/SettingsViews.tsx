import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { router, type Href } from 'expo-router';
import Constants from 'expo-constants';
import { useDispatch, useSelector } from 'react-redux';

import { Avatar, Button, Card, Radio, Segmented } from '../../../../packages/ui-native/src';
import { Dialog, Gate, Section, RX_TONE, CARE_TONE } from '../consult/ConsultKit';
import { AuthField } from '../auth/AuthKit';
import { Notice, Panel, Row, SheetForm, rowsOf, useRemote } from '../health/HealthKit';
import { step as scale, useScreenUi } from '../screen/ScreenKit';
import { LANGUAGES, useApp, type ThemeMode } from '../../context/AppContext';
import { logout } from '../../store/slices/authSlice';
import { getCalendarPref, onCalendarPrefChange, setCalendarPref, type CalendarPref } from '../../utils/dates';
import { apiFetch } from '../../utils/api';
import { logError } from '../../utils/logger';
import { AccountScreen, ToggleRow, useFlags } from './AccountKit';

/**
 * Settings (merge map section 3): the hub, notifications, language with appearance, and security with the active sessions.
 * Privacy, help and about are in their own files. Every setting is read from and saved to the endpoint named on its screen.
 */

interface AuthUser { name?: string; full_name?: string; email?: string; phone?: string }

/** `/settings`: the account summary and the list of sections. The sections hold the content; the hub holds none. */
export function SettingsHubView() {
  const { k, theme, t, c, flow } = useScreenUi();
  const dispatch = useDispatch();
  const user = useSelector((state: { auth: { user: AuthUser | null } }) => state.auth.user);
  const name = user?.name || user?.full_name || '';
  const line = user?.email || user?.phone || '';
  const version = Constants.expoConfig?.version ?? '';
  const go = (route: string) => () => router.push(route as Href);
  const signOut = () => {
    dispatch(logout());
    router.replace('/(auth)/welcome' as Href);
  };
  return (
    <AccountScreen title={k('set.title')} fallback={'/profile' as Href} testID="settings-screen">
      <Card theme={theme}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Avatar name={name || k('set.account')} size="md" theme={theme} />
          <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
            <Text style={{ ...scale(t, 'bodyStrong'), color: c.text.primary, ...flow }}>{name || k('set.account')}</Text>
            {line ? <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, writingDirection: 'ltr', textAlign: flow.textAlign }}>{line}</Text> : null}
          </View>
          <Button label={k('set.profile')} variant="outline" size="sm" onPress={go('/profile')} theme={theme} testID="settings-profile" />
        </View>
      </Card>
      <Panel testID="settings-sections">
        <Row icon="bell" tone={RX_TONE} title={k('set.notifications')} subtitle={k('set.notificationsHint')} onPress={go('/settings/notifications')} testID="settings-notifications" />
        <Row icon="lock" tone="violet" title={k('set.privacy')} subtitle={k('set.privacyHint')} onPress={go('/settings/privacy')} testID="settings-privacy" />
        <Row icon="shield-check" tone={CARE_TONE} title={k('set.security')} subtitle={k('set.securityHint')} onPress={go('/settings/security')} testID="settings-security" />
        <Row icon="globe" tone="blue" title={k('set.language')} subtitle={k('set.languageHint')} onPress={go('/settings/language')} testID="settings-language" />
        <Row icon="headset" tone="mint" title={k('set.help')} subtitle={k('set.helpHint')} onPress={go('/settings/help')} testID="settings-help" />
        <Row icon="info" tone="ink" title={k('set.about')} subtitle={k('set.aboutHint')} onPress={go('/settings/about')} last testID="settings-about" />
      </Panel>
      <Button label={k('set.signOut')} variant="outline" size="lg" fullWidth startIcon="sign-out" onPress={signOut} theme={theme} testID="settings-sign-out" />
      {version ? <Text style={{ ...scale(t, 'tag', 'regular'), color: c.text.tertiary, textAlign: 'center' }}>{k('set.version', { version })}</Text> : null}
    </AccountScreen>
  );
}

const NOTIFICATION_KEYS = ['general', 'appointments', 'orders', 'offers', 'medications', 'doctorMessages', 'emergency'] as const;
const SOUND_KEYS = ['sound', 'vibration'] as const;
/** The emergency alerts are required: on, and not changeable. */
const LOCKED = new Set<string>(['emergency']);
const NOTIFICATION_DEFAULTS: Record<string, boolean> = Object.fromEntries([...NOTIFICATION_KEYS, ...SOUND_KEYS].map((key) => [key, true]));

/** `/settings/notifications`: GET/PATCH /users/me/notification-settings, one switch per kind. */
export function NotificationSettingsView() {
  const { k } = useScreenUi();
  const { flags, toggle, failed, status, reload } = useFlags('/users/me/notification-settings', NOTIFICATION_DEFAULTS, 'settings:notifications');
  return (
    <AccountScreen title={k('set.notifications')} testID="notification-settings-screen">
      <Gate status={status} onRetry={() => void reload()}>
        {failed ? <Notice tone="danger" text={k('set.saveFailed')} /> : null}
        <Section title={k('set.notif.kinds')}>
          <Panel testID="notification-kinds">
            {NOTIFICATION_KEYS.map((key, i) => (
              <ToggleRow key={key} label={k(`set.notif.${key}`)} hint={k(`set.notif.${key}Hint`)} value={flags[key] !== false} disabled={LOCKED.has(key)} onChange={(next) => void toggle(key, next)} last={i === NOTIFICATION_KEYS.length - 1} testID={`notif-${key}`} />
            ))}
          </Panel>
        </Section>
        <Section title={k('set.notif.alerts')}>
          <Panel testID="notification-alerts">
            {SOUND_KEYS.map((key, i) => (
              <ToggleRow key={key} label={k(`set.notif.${key}`)} hint={k(`set.notif.${key}Hint`)} value={flags[key] !== false} onChange={(next) => void toggle(key, next)} last={i === SOUND_KEYS.length - 1} testID={`notif-${key}`} />
            ))}
          </Panel>
        </Section>
        <Notice tone="info" text={k('set.notif.required')} />
      </Gate>
    </AccountScreen>
  );
}

const THEME_MODES: ThemeMode[] = ['system', 'light', 'dark'];
const THEME_KEY: Record<ThemeMode, string> = { system: 'common.themeAuto', light: 'common.themeLight', dark: 'common.themeDark' };
const CALENDARS: CalendarPref[] = ['gregory', 'hijri', 'auto'];

/** `/settings/language`: the six languages, the appearance (auto, light, dark) and the calendar, on the Settings board. */
export function LanguageSettingsView() {
  const { k, theme, t, c, dir, flow } = useScreenUi();
  const { lang, setLang, themeMode, setThemeMode } = useApp();
  const [calendar, setCalendar] = useState<CalendarPref>(getCalendarPref());
  useEffect(() => onCalendarPrefChange(() => setCalendar(getCalendarPref())), []);
  return (
    <AccountScreen title={k('set.languageTitle')} testID="language-settings-screen">
      <Section title={k('common.theme')}>
        <Segmented label={k('common.theme')} value={themeMode} onChange={(v) => setThemeMode(v as ThemeMode)} options={THEME_MODES.map((mode) => ({ value: mode, label: k(THEME_KEY[mode]) }))} theme={theme} testID="theme-mode" />
        <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{k('set.themeAutoHint')}</Text>
      </Section>
      <Section title={k('common.language')}>
        <Card theme={theme} padding="none">
          <View accessibilityRole="radiogroup" accessibilityLabel={k('common.language')}>
            {LANGUAGES.map((item, i) => (
              <Radio key={item.code} label={item.native} meta={item.label} selected={lang === item.code} onChange={() => setLang(item.code)} divider={i < LANGUAGES.length - 1} direction={dir} theme={theme} testID={`language-${item.code}`} />
            ))}
          </View>
        </Card>
      </Section>
      <Section title={k('set.calendar')}>
        <Segmented label={k('set.calendar')} value={calendar} onChange={(v) => void setCalendarPref(v as CalendarPref)} options={CALENDARS.map((mode) => ({ value: mode, label: k(`set.calendar.${mode}`) }))} theme={theme} testID="calendar-pref" />
      </Section>
    </AccountScreen>
  );
}

interface SessionRow { id: string; device?: string; location?: string; time?: string; current?: boolean }

/** `/settings/security`: biometric and two-step switches, change password, and the active sessions (sign one out). */
export function SecuritySettingsView() {
  const { k, theme, t, c, flow } = useScreenUi();
  const { flags, toggle, failed } = useFlags('/users/me/security-settings', { biometric: true, two_factor: false }, 'settings:security');
  const sessions = useRemote(async () => rowsOf<SessionRow>(await apiFetch('/users/me/sessions')), [], 'settings:sessions');
  const [list, setList] = useState<SessionRow[]>([]);
  useEffect(() => {
    if (sessions.data) setList(sessions.data);
  }, [sessions.data]);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [again, setAgain] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [ending, setEnding] = useState<SessionRow | null>(null);
  const [endBusy, setEndBusy] = useState(false);
  const [endFailed, setEndFailed] = useState(false);

  const closePassword = () => {
    setPasswordOpen(false);
    setCurrent('');
    setNext('');
    setAgain('');
    setError(null);
  };
  const savePassword = async () => {
    if (!current || !next) {
      setError(k('set.security.passwordRequired'));
      return;
    }
    if (next !== again) {
      setError(k('set.security.passwordMismatch'));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await apiFetch('/users/me/change-password', { method: 'POST', body: JSON.stringify({ current_password: current, new_password: next }) });
      closePassword();
      setSaved(true);
    } catch (e) {
      logError('settings:change-password', e);
      setError(k('set.security.passwordFailed'));
    } finally {
      setSaving(false);
    }
  };
  const endSession = async () => {
    if (!ending) return;
    setEndBusy(true);
    setEndFailed(false);
    try {
      await apiFetch(`/users/me/sessions/${ending.id}`, { method: 'DELETE' });
      setList((rows) => rows.filter((row) => row.id !== ending.id));
      setEnding(null);
    } catch (e) {
      logError('settings:end-session', e);
      setEndFailed(true);
    } finally {
      setEndBusy(false);
    }
  };

  return (
    <AccountScreen title={k('set.security')} testID="security-settings-screen">
      {failed ? <Notice tone="danger" text={k('set.saveFailed')} /> : null}
      {saved ? <Notice tone="success" text={k('set.security.passwordSaved')} /> : null}
      <Section title={k('set.security.signIn')}>
        <Panel testID="security-flags">
          <ToggleRow label={k('set.security.biometric')} hint={k('set.security.biometricHint')} value={flags.biometric !== false} onChange={(v) => void toggle('biometric', v)} testID="security-biometric" />
          <ToggleRow label={k('set.security.twoFactor')} hint={k('set.security.twoFactorHint')} value={flags.two_factor === true} onChange={(v) => void toggle('two_factor', v)} testID="security-two-factor" />
          <Row icon="key" tone="amber" title={k('set.security.password')} subtitle={k('set.security.passwordHint')} onPress={() => { setSaved(false); setPasswordOpen(true); }} last testID="security-password" />
        </Panel>
      </Section>
      <Section title={k('set.security.sessions')}>
        <Gate status={sessions.status} onRetry={() => void sessions.reload()}>
          {list.length === 0 ? (
            <Text style={{ ...scale(t, 'small', 'regular'), color: c.text.secondary, ...flow }}>{k('set.security.noSessions')}</Text>
          ) : (
            <Panel testID="security-sessions">
              {list.map((row, i) => (
                <Row
                  key={row.id}
                  icon="user-circle"
                  tone={row.current ? 'mint' : 'ink'}
                  title={row.device || k('set.security.thisDevice')}
                  subtitle={[row.location, row.time].filter(Boolean).join(' · ')}
                  caption={row.current ? k('set.security.current') : undefined}
                  trailing={row.current ? undefined : <Button label={k('set.security.end')} variant="outline" size="sm" onPress={() => { setEndFailed(false); setEnding(row); }} theme={theme} testID={`session-end-${row.id}`} />}
                  last={i === list.length - 1}
                />
              ))}
            </Panel>
          )}
        </Gate>
      </Section>

      <SheetForm open={passwordOpen} title={k('set.security.password')} onClose={closePassword} onSave={() => void savePassword()} saving={saving} error={error} saveLabel={k('set.security.passwordSave')} testID="password-form">
        <AuthField label={k('set.security.currentPassword')} value={current} onChangeText={setCurrent} secure ltr autoCapitalize="none" autoComplete="current-password" testID="password-current" />
        <AuthField label={k('set.security.newPassword')} value={next} onChangeText={setNext} secure ltr autoCapitalize="none" autoComplete="new-password" testID="password-new" />
        <AuthField label={k('set.security.confirmPassword')} value={again} onChangeText={setAgain} secure ltr autoCapitalize="none" autoComplete="new-password" testID="password-again" />
      </SheetForm>

      <Dialog open={ending !== null} icon="sign-out" title={k('set.security.endTitle')} body={k('set.security.endBody', { device: ending?.device || k('set.security.thisDevice') })}>
        {endFailed ? <Notice tone="danger" text={k('set.security.endFailed')} /> : null}
        <Button label={k('set.security.end')} variant="danger" size="lg" fullWidth loading={endBusy} onPress={() => void endSession()} theme={theme} testID="session-end-confirm" />
        <Button label={k('cancel')} variant="outline" size="lg" fullWidth onPress={() => setEnding(null)} theme={theme} testID="session-end-cancel" />
      </Dialog>
    </AccountScreen>
  );
}
