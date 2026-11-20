import React, { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { type Href } from 'expo-router';

import { Button } from '../../../../packages/ui-native/src';
import { Gate } from '../consult/ConsultKit';
import { Notice, Panel, Row, useRemote } from '../health/HealthKit';
import { step as scale, useScreenUi } from '../screen/ScreenKit';
import { apiFetch } from '../../utils/api';
import { fmtDate } from '../../utils/dates';
import { logError } from '../../utils/logger';
import { AGENT_SCOPE_KEYS, parseAgentConnections, type AgentConnection } from '../../utils/agentConnections';
import { AccountScreen } from './AccountKit';

/**
 * `/settings/connected-apps`: the AI assistants the patient connected (GET /patient/agent-connections) with what each may do, and a
 * disconnect (DELETE /patient/agent-connections/:clientId, which ends that assistant's tokens at once). Same screen as the website's.
 */
export function ConnectedAppsView() {
  const { k, c, t, flow, theme } = useScreenUi();
  const remote = useRemote(async () => parseAgentConnections(await apiFetch('/patient/agent-connections')), [], 'settings:connected-apps');
  const [list, setList] = useState<AgentConnection[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (remote.data) setList(remote.data);
  }, [remote.data]);

  const disconnect = async (clientId: string) => {
    if (busy) return;
    setBusy(clientId);
    setFailed(false);
    try {
      await apiFetch(`/patient/agent-connections/${encodeURIComponent(clientId)}`, { method: 'DELETE' });
      setList((rows) => rows.filter((row) => row.clientId !== clientId));
    } catch (e) {
      logError('settings:disconnect-app', e);
      setFailed(true);
    } finally {
      setBusy(null);
    }
  };
  const since = (iso?: string) => {
    const d = iso ? new Date(iso) : null;
    return d && !Number.isNaN(d.getTime()) ? k('set.apps.since', { date: fmtDate(d, { dateStyle: 'medium' }) }) : '';
  };

  return (
    <AccountScreen title={k('set.connectedApps')} fallback={'/settings' as Href} testID="connected-apps-screen">
      <Gate status={remote.status} onRetry={() => void remote.reload()}>
        {failed ? <Notice tone="danger" text={k('set.apps.failed')} /> : null}
        {list.length === 0 ? (
          <Notice tone="info" text={`${k('set.apps.emptyTitle')}. ${k('set.apps.empty')}`} />
        ) : (
          <Panel testID="connected-apps-list">
            {list.map((app, i) => (
              <Row
                key={app.clientId}
                icon="sparkle"
                tone="violet"
                title={app.name ?? app.clientId}
                subtitle={[app.scopes.map((s) => k(AGENT_SCOPE_KEYS[s])).join(' · '), since(app.connectedAt)].filter(Boolean).join('\n')}
                trailing={<Button label={k('set.apps.disconnect')} variant="outline" size="sm" loading={busy === app.clientId} disabled={busy !== null} onPress={() => void disconnect(app.clientId)} theme={theme} testID={`connected-app-disconnect-${app.clientId}`} />}
                last={i === list.length - 1}
              />
            ))}
          </Panel>
        )}
        <Text style={{ ...scale(t, 'small', 'regular'), color: c.text.secondary, ...flow }}>{k('set.apps.note')}</Text>
      </Gate>
    </AccountScreen>
  );
}
