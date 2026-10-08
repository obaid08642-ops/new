import React, { useState } from 'react';
import { Text } from 'react-native';
import { router, type Href } from 'expo-router';

import { Button, EmptyState } from '../../../packages/ui-native/src';
import { Gate, Section, useConsultFormat } from '../../src/components/consult/ConsultKit';
import { HealthScreen, MetricGrid, MetricTile, Panel, Pill, Row, rowsOf, useRemote } from '../../src/components/health/HealthKit';
import { step as scale, useScreenUi } from '../../src/components/screen/ScreenKit';
import { Glyph } from '../../src/components/pharmacy/PharmacyKit';
import { showLocalizedAlert } from '../../src/components/LocalizedAlert';
import { featureFlags } from '../../src/services/FeatureFlags';
import { apiFetch } from '../../src/utils/api';

/**
 * Wearables (restyle only, merge map row "Wearables"): the devices of GET /wearables/devices, the latest sample of each metric of
 * GET /wearables/data and the registration of a device (POST /wearables/devices), exactly as before, on the health template.
 * Pairing stays hidden behind the `wearables_enabled` flag until the real HealthKit / Health Connect integration exists.
 */

const SUPPORTED_DEVICES = ['Apple Watch', 'Samsung Galaxy Watch', 'Fitbit', 'Garmin', 'Xiaomi Mi Band', 'Huawei Watch'];
const METRIC: Record<string, { label: string; icon: 'heartbeat' | 'heart' | 'moon' | 'scales' | 'drop' | 'chart-line-up' }> = {
  steps: { label: 'health.wearables.steps', icon: 'chart-line-up' },
  calories: { label: 'health.wearables.calories', icon: 'chart-line-up' },
  sleep: { label: 'health.wearables.sleep', icon: 'moon' },
  heart_rate: { label: 'health.wearables.heart_rate', icon: 'heartbeat' },
  weight: { label: 'health.wearables.weight', icon: 'scales' },
  blood_pressure: { label: 'health.wearables.blood_pressure', icon: 'heart' },
  oxygen: { label: 'health.wearables.oxygen', icon: 'drop' },
};

interface Device { id: string; name?: string; kind?: string; connected_at?: string }
interface Sample { metric?: string; value?: string | number; unit?: string; recorded_at?: string }

export default function WearablesScreen() {
  const { k, theme, t, c, flow } = useScreenUi();
  const fmt = useConsultFormat();
  const enabled = featureFlags.isEnabled('wearables_enabled');
  const [registering, setRegistering] = useState<string | null>(null);
  const { status, data, reload } = useRemote(async () => {
    if (!enabled) return { devices: [] as Device[], samples: [] as Sample[] };
    const [devices, samples] = await Promise.all([apiFetch('/wearables/devices').catch(() => null), apiFetch('/wearables/data').catch(() => null)]);
    return { devices: rowsOf<Device>(devices), samples: rowsOf<Sample>(samples) };
  }, [enabled], 'health:wearables');

  if (!enabled) {
    return (
      <HealthScreen title={k('health.wearables.title')} testID="wearables-screen">
        <EmptyState icon="heart" tone="blue" title={k('health.wearables.soon')} body={k('health.wearables.soonBody')} theme={theme} />
      </HealthScreen>
    );
  }

  const devices = data?.devices ?? [];
  const latest: Record<string, Sample> = {};
  for (const s of data?.samples ?? []) {
    if (!s?.metric) continue;
    if (!latest[s.metric] || new Date(String(s.recorded_at)) > new Date(String(latest[s.metric].recorded_at))) latest[s.metric] = s;
  }
  const metrics = Object.entries(latest);

  const register = async (name: string) => {
    setRegistering(name);
    try {
      await apiFetch('/wearables/devices', { method: 'POST', body: JSON.stringify({ kind: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), name }) });
      await reload(true);
      showLocalizedAlert(k('health.wearables.paired'), k('health.wearables.pairedBody', { name }));
    } catch {
      showLocalizedAlert(k('health.wearables.pairFailed'), k('health.wearables.pairFailedBody'));
    } finally {
      setRegistering(null);
    }
  };

  return (
    <HealthScreen title={k('health.wearables.title')} onRefresh={() => void reload(true)} actions={[{ key: 'sleep', icon: <Glyph name="moon" size={20} color={c.icon.primary} />, label: k('health.hub.sleep'), onPress: () => router.push('/health/sleep' as Href) }]} testID="wearables-screen">
      <Gate status={status} onRetry={() => void reload()}>
        {metrics.length > 0 ? (
          <Section title={k('health.wearables.latest')}>
            <MetricGrid>
              {metrics.map(([metric, s]) => (
                <MetricTile key={metric} label={METRIC[metric] ? k(METRIC[metric].label) : metric} value={String(s.value ?? '')} unit={s.unit} caption={fmt.date(s.recorded_at)} icon={METRIC[metric]?.icon ?? 'heartbeat'} tone="blue" />
              ))}
            </MetricGrid>
          </Section>
        ) : null}

        <Section title={k('health.wearables.mine')}>
          {devices.length === 0 ? (
            <Text style={{ ...scale(t, 'small', 'regular'), color: c.text.secondary, ...flow }}>{k('health.wearables.none')}</Text>
          ) : (
            <Panel>
              {devices.map((d, i) => (
                <Row key={d.id} icon="heart" tone="blue" title={d.name || d.kind || ''} subtitle={d.connected_at ? k('health.wearables.since', { date: fmt.date(d.connected_at) }) : undefined} trailing={<Pill label={k('health.wearables.connected')} tone="success" />} last={i === devices.length - 1} />
              ))}
            </Panel>
          )}
        </Section>

        <Section title={k('health.wearables.pair')}>
          <Panel>
            {SUPPORTED_DEVICES.map((name, i) => {
              const already = devices.some((d) => d.name === name);
              return (
                <Row
                  key={name}
                  icon="heart"
                  tone="blue"
                  title={name}
                  trailing={already ? <Pill label={k('health.wearables.connected')} tone="success" /> : <Button label={k('health.wearables.connect')} size="sm" variant="outline" loading={registering === name} disabled={registering !== null} onPress={() => void register(name)} theme={theme} testID={`pair-${i}`} />}
                  last={i === SUPPORTED_DEVICES.length - 1}
                />
              );
            })}
          </Panel>
        </Section>
      </Gate>
    </HealthScreen>
  );
}
