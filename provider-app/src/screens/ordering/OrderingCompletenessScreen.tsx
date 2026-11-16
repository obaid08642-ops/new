import React from 'react';
import { View, Text } from 'react-native';
import { useTheme, useAuth, useLang } from '../../context';
import { NBtn, NCard, NHeader, NScroll, NBadge } from '../../components/ui';
import { SP, R, FS, FW } from '../../constants';
import { OrderingApi, type CompletenessPart } from '../../api/ordering';
import { insuranceSummary, itemName, lacksPrice, partPoints } from './logic';
import { Label, LoadState, Row, fmtMoney, useAR, useKind, useLoad, type OrderingScreenProps } from './common';

// Ord33: GET /provider/ordering/completeness (score, parts, missing) + the real settings and items for the patient preview.
export function OrderingCompletenessScreen({ kind, onBack, onNav }: OrderingScreenProps) {
  const AR = useAR();
  const { t: tt } = useLang();
  const { theme } = useTheme();
  const { user } = useAuth();
  const k = useKind(kind);
  const comp = useLoad(() => OrderingApi.completeness(), []);
  const settings = useLoad(() => OrderingApi.getSettings(), []);
  const items = useLoad(() => (k ? OrderingApi.listItems(k) : Promise.resolve([])), [k]);

  const reload = () => { comp.reload(); settings.reload(); items.reload(); };
  const c = comp.data;
  const s = settings.data;
  const list = items.data ?? [];
  const hidden = list.filter(lacksPrice).length;
  const visible = list.filter((i) => i.available && !lacksPrice(i));

  const label = (part: CompletenessPart, n: number): string => {
    switch (part) {
      case 'prices': return tt('tpw.fc5f6243', { p1: String(n) });
      case 'modes_hours': return tt('sxzb.793834ce');
      case 'insurance': return tt('sxzb.91d149de');
      case 'prep_turnaround': return tt('tpw.0f958dd3', { p1: String(n) });
      default: return tt('sxzb.225927f7');
    }
  };
  const target = (part: CompletenessPart) => (part === 'modes_hours' ? 'ordering_settings' : part === 'photo_licence' ? null : part === 'insurance' ? 'ordering_settings' : 'ordering_items');
  const ins = s ? insuranceSummary(s.accepted_insurance) : { companies: 0, classes: 0 };
  const fromPrice = (() => {
    const all = visible.flatMap((i) => Object.values(i.prices).filter((p): p is number => typeof p === 'number'));
    return all.length ? Math.min(...all) : null;
  })();

  return (
    <NScroll>
      <NHeader onBack={onBack} title={tt('sxzb.cb8b40b6')} />
      <LoadState loading={comp.loading || settings.loading || items.loading} error={comp.error || settings.error || items.error} onRetry={reload}>
        {c && (
          <View style={{ gap: SP.md, paddingTop: SP.md }}>
            <NCard>
              <Text style={{ fontSize: FS['2xl'], fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left' }}>
                {tt('tpw.d368dd54', { p1: String(c.score) })}
              </Text>
              <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: c.score }} style={{ height: 10, borderRadius: R.full, backgroundColor: theme.surface2, overflow: 'hidden', marginTop: SP.md }}>
                <View style={{ width: `${Math.max(0, Math.min(100, c.score))}%`, height: 10, backgroundColor: theme.primary, alignSelf: 'flex-start' }} />
              </View>
            </NCard>

            <Label bold>{tt('sxzb.fed5b657')}</Label>
            {c.missing.length === 0 && <NBadge label={tt('sxzb.4f083ca6')} variant="success" />}
            {c.missing.map((m) => (
              <NCard key={m.part} onPress={target(m.part) ? () => onNav(target(m.part) as string) : undefined}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <View style={{ flex: 1 }}><Label>{label(m.part, m.count)}</Label></View>
                  <NBadge size="xs" variant="primary" label={AR ? `+${partPoints(m.part, c.parts, c.weights)}٪` : `+${partPoints(m.part, c.parts, c.weights)}%`} />
                </Row>
              </NCard>
            ))}
            <Row>
              <NBtn size="sm" variant="outline" full={false} label={tt('sxzb.44bd35c7')} onPress={() => onNav('ordering_settings')} />
              <NBtn size="sm" variant="outline" full={false} label={tt('sxzb.d6c0bd39')} onPress={() => onNav('ordering_items')} />
            </Row>

            <Label bold>{tt('sxzb.9b950f89')}</Label>
            <Label sub>{tt('sxzb.87d9a675')}</Label>
            <NCard>
              <Text style={{ fontSize: FS.lg, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left' }}>{user?.displayName || user?.name || ''}</Text>
              {s && <Label sub>{s.modes.map((m) => (m === 'home' ? (tt('sxzb.69ba9eb5')) : (tt('sxzb.0255c256')))).join(' · ')}</Label>}
              {s?.modes.includes('home') && <Label sub>{tt('sxzb.9ccaa7a5')}{fmtMoney(s.home_fee, AR)}{' · '}{tt('tpw.0a77475e', { p1: String(s.home_radius_km ?? '-') })}</Label>}
              {fromPrice !== null && <Label>{tt('sxzb.f67b174f')}{fmtMoney(fromPrice, AR)}</Label>}
              <Label sub>{tt('tpw.afe91f3d', { p1: String(ins.companies), p2: String(ins.classes) })}</Label>
              <Label sub>{tt('tpw.09250438', { p1: String(visible.length) })}</Label>
              {hidden > 0 && <Text style={{ color: theme.warn, fontSize: FS.sm, textAlign: AR ? 'right' : 'left' }}>{tt('tpw.0a16a045', { p1: String(hidden) })}</Text>}
              {s?.auto_accept && <NBadge size="xs" variant="success" label={tt('sxzb.748f71af')} />}
              {visible.slice(0, 3).map((i) => <Label key={i.catalog_id} sub>{itemName(i, AR)}</Label>)}
            </NCard>
          </View>
        )}
      </LoadState>
    </NScroll>
  );
}
