import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { router, type Href } from 'expo-router';

import { Button, Card } from '../../../../packages/ui-native/src';
import { Dialog, Gate, Section } from '../consult/ConsultKit';
import { AuthField } from '../auth/AuthKit';
import { HealthTabs, Notice, Panel, SheetForm, bodyOf, rowsOf, useRemote, useTab } from '../health/HealthKit';
import { step as scale, useScreenUi } from '../screen/ScreenKit';
import { apiFetch } from '../../utils/api';
import { logError } from '../../utils/logger';
import { AccountScreen, ToggleRow, useFlags } from './AccountKit';

/**
 * Privacy and data (merge map section 3): three sections in one screen, `?tab=privacy|data|delete`.
 * Privacy: GET/PATCH /users/me/privacy-settings. My data: GET /users/me/storage and the export of everything
 * (GET /users/me/data-export, handed to the share sheet as a file). Delete: DELETE /users/me with the password, then sign out.
 * /settings/data redirects to ?tab=data.
 */

const TABS = ['privacy', 'data', 'delete'] as const;
const PRIVACY_KEYS = ['location', 'analytics', 'shareData', 'marketing', 'thirdParty'] as const;
const PRIVACY_DEFAULTS: Record<string, boolean> = { location: true, analytics: true, shareData: false, marketing: false, thirdParty: false };

interface FileHandle { exists: boolean; uri: string; delete(): void; create(): void; write(text: string): void }
interface LegacyFileSystem { File: new (directory: unknown, name: string) => FileHandle; Paths: { cache: unknown } }

export function PrivacyView() {
  const { k } = useScreenUi();
  const [tab, setTab] = useTab(TABS, 'privacy');
  return (
    <AccountScreen title={k('set.privacy')} testID="privacy-screen">
      <HealthTabs tabs={TABS.map((key) => ({ key, label: k(`set.privacy.tab.${key}`) }))} value={tab} onChange={setTab} testID="privacy-tabs" />
      {tab === 'privacy' ? <PrivacyTab /> : null}
      {tab === 'data' ? <DataTab /> : null}
      {tab === 'delete' ? <DeleteTab /> : null}
    </AccountScreen>
  );
}

function PrivacyTab() {
  const { k } = useScreenUi();
  const { flags, toggle, failed, status, reload } = useFlags('/users/me/privacy-settings', PRIVACY_DEFAULTS, 'settings:privacy');
  return (
    <Gate status={status} onRetry={() => void reload()}>
      {failed ? <Notice tone="danger" text={k('set.saveFailed')} /> : null}
      <Panel testID="privacy-flags">
        {PRIVACY_KEYS.map((key, i) => (
          <ToggleRow key={key} label={k(`set.privacy.${key}`)} hint={k(`set.privacy.${key}Hint`)} value={flags[key] === true} onChange={(next) => void toggle(key, next)} last={i === PRIVACY_KEYS.length - 1} testID={`privacy-${key}`} />
        ))}
      </Panel>
    </Gate>
  );
}

interface StorageItem { label?: string; val?: string; pct?: number }

function DataTab() {
  const { k, theme, t, c, flow } = useScreenUi();
  const storage = useRemote(async () => {
    const body = bodyOf<{ items?: unknown; total?: string }>(await apiFetch('/users/me/storage'));
    return { items: rowsOf<StorageItem>(body.items), total: typeof body.total === 'string' ? body.total : '' };
  }, [], 'settings:storage');
  const [exporting, setExporting] = useState(false);
  const [failed, setFailed] = useState(false);

  const exportAll = async () => {
    setExporting(true);
    setFailed(false);
    try {
      const payload = await apiFetch('/users/me/data-export');
      const FS = (await import('expo-file-system/legacy')) as unknown as LegacyFileSystem;
      const { shareAsync } = await import('expo-sharing');
      const fileName = `nabd-data-export-${new Date().toISOString().slice(0, 10)}.json`;
      const file = new FS.File(FS.Paths.cache, fileName);
      if (file.exists) file.delete();
      file.create();
      file.write(JSON.stringify(payload, null, 2));
      await shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: fileName });
    } catch (e) {
      logError('settings:data-export', e);
      setFailed(true);
    } finally {
      setExporting(false);
    }
  };

  const items = storage.data?.items ?? [];
  return (
    <>
      <Section title={k('set.data.storage')}>
        <Gate status={storage.status} onRetry={() => void storage.reload()}>
          {items.length === 0 ? (
            <Text style={{ ...scale(t, 'small', 'regular'), color: c.text.secondary, ...flow }}>{k('set.data.storageEmpty')}</Text>
          ) : (
            <Card theme={theme}>
              <View style={{ gap: 14 }}>
                {items.map((item, i) => (
                  <View key={`${item.label}-${i}`} style={{ gap: 6 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                      <Text style={{ ...scale(t, 'small', 'medium'), color: c.text.primary, flexShrink: 1, ...flow }}>{item.label}</Text>
                      <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary }}>{item.val}</Text>
                    </View>
                    <View accessibilityRole="progressbar" accessibilityLabel={item.label} accessibilityValue={{ min: 0, max: 100, now: Math.max(0, Math.min(100, Number(item.pct) || 0)) }} style={{ height: 8, borderRadius: 4, backgroundColor: c.border.hairline, overflow: 'hidden' }}>
                      <View style={{ width: `${Math.max(0, Math.min(100, Number(item.pct) || 0))}%`, height: 8, borderRadius: 4, backgroundColor: c.action.primary.bg }} />
                    </View>
                  </View>
                ))}
                {storage.data?.total ? <Text style={{ ...scale(t, 'meta', 'medium'), color: c.text.secondary, ...flow }}>{k('set.data.total', { total: storage.data.total })}</Text> : null}
              </View>
            </Card>
          )}
        </Gate>
      </Section>
      <Section title={k('set.data.export')}>
        <Card theme={theme}>
          <View style={{ gap: 12 }}>
            <Text style={{ ...scale(t, 'small', 'regular'), color: c.text.secondary, ...flow }}>{k('set.data.exportBody')}</Text>
            {failed ? <Notice tone="danger" text={k('set.data.exportFailed')} /> : null}
            <Button label={exporting ? k('set.data.exporting') : k('set.data.exportAll')} size="lg" fullWidth loading={exporting} onPress={() => void exportAll()} theme={theme} testID="data-export" />
          </View>
        </Card>
      </Section>
    </>
  );
}

function DeleteTab() {
  const { k, theme, t, c, flow } = useScreenUi();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setPasswordOpen(false);
    setPassword('');
    setError(null);
  };
  const erase = async () => {
    if (!password) {
      setError(k('set.delete.passwordRequired'));
      return;
    }
    setDeleting(true);
    setError(null);
    try {
      await apiFetch('/users/me', { method: 'DELETE', body: JSON.stringify({ password }) });
      close();
      // The account is gone: drop the local session and leave the app.
      await apiFetch('/auth/logout', { method: 'POST' }).catch(() => undefined);
      router.replace('/(auth)/login' as Href);
    } catch (e) {
      logError('settings:delete-account', e);
      setError(k('set.delete.failed'));
    } finally {
      setDeleting(false);
    }
  };
  return (
    <>
      <Card theme={theme}>
        <View style={{ gap: 12 }}>
          <Text accessibilityRole="header" style={{ ...scale(t, 'bodyStrong'), color: c.text.primary, ...flow }}>{k('set.delete.title')}</Text>
          <Text style={{ ...scale(t, 'small', 'regular'), color: c.text.secondary, ...flow }}>{k('set.delete.body')}</Text>
          <Button label={k('set.delete.action')} variant="danger" size="lg" fullWidth onPress={() => setConfirmOpen(true)} theme={theme} testID="delete-account" />
        </View>
      </Card>
      <Dialog open={confirmOpen} icon="warning" title={k('set.delete.confirmTitle')} body={k('set.delete.confirmBody')}>
        <Button label={k('set.delete.continue')} variant="danger" size="lg" fullWidth onPress={() => { setConfirmOpen(false); setPasswordOpen(true); }} theme={theme} testID="delete-continue" />
        <Button label={k('cancel')} variant="outline" size="lg" fullWidth onPress={() => setConfirmOpen(false)} theme={theme} testID="delete-cancel" />
      </Dialog>
      <SheetForm open={passwordOpen} title={k('set.delete.passwordTitle')} onClose={close} onSave={() => void erase()} saving={deleting} error={error} saveLabel={k('set.delete.final')} testID="delete-form">
        <Text style={{ ...scale(t, 'small', 'regular'), color: c.text.secondary, ...flow }}>{k('set.delete.passwordBody')}</Text>
        <AuthField label={k('set.delete.password')} value={password} onChangeText={setPassword} secure ltr autoCapitalize="none" autoComplete="current-password" testID="delete-password" />
      </SheetForm>
    </>
  );
}
