import React from 'react';
import { View, Text } from 'react-native';
import { useTheme, useAuth } from '../../context';
import { NBtn, NCard, NHeader, NScroll, NBadge } from '../../components/ui';
import { SP, R, FS, FW } from '../../constants';
import { OrderingApi, type CompletenessPart } from '../../api/ordering';
import { insuranceSummary, itemName, lacksPrice, partPoints } from './logic';
import { Label, LoadState, Row, fmtMoney, useAR, useKind, useLoad, type OrderingScreenProps } from './common';

// Ord33: GET /provider/ordering/completeness (score, parts, missing) + the real settings and items for the patient preview.
export function OrderingCompletenessScreen({ kind, onBack, onNav }: OrderingScreenProps) {
  const AR = useAR();
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
      case 'prices': return AR ? `أضف أسعار ${n} فحصًا` : `Add prices for ${n} tests`;
      case 'modes_hours': return AR ? 'طرق الخدمة وساعات الدوام' : 'Service modes and working hours';
      case 'insurance': return AR ? 'شركات التأمين وفئاتها' : 'Insurers and classes';
      case 'prep_turnaround': return AR ? `أضف مدة النتيجة لـ ${n} فحوص` : `Add turnaround for ${n} tests`;
      default: return AR ? 'الرخصة والصورة الشخصية' : 'Licence and profile photo';
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
      <NHeader onBack={onBack} title={AR ? 'اكتمال ملفك' : 'Profile completeness'} />
      <LoadState loading={comp.loading || settings.loading || items.loading} error={comp.error || settings.error || items.error} onRetry={reload}>
        {c && (
          <View style={{ gap: SP.md, paddingTop: SP.md }}>
            <NCard>
              <Text style={{ fontSize: FS['2xl'], fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left' }}>
                {AR ? `اكتمال ملفك ${c.score}٪` : `Your profile is ${c.score}% complete`}
              </Text>
              <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: c.score }} style={{ height: 10, borderRadius: R.full, backgroundColor: theme.surface2, overflow: 'hidden', marginTop: SP.md }}>
                <View style={{ width: `${Math.max(0, Math.min(100, c.score))}%`, height: 10, backgroundColor: theme.primary, alignSelf: 'flex-start' }} />
              </View>
            </NCard>

            <Label bold>{AR ? 'المتبقي' : 'To do'}</Label>
            {c.missing.length === 0 && <NBadge label={AR ? 'مكتمل' : 'Done'} variant="success" />}
            {c.missing.map((m) => (
              <NCard key={m.part} onPress={target(m.part) ? () => onNav(target(m.part) as string) : undefined}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <View style={{ flex: 1 }}><Label>{label(m.part, m.count)}</Label></View>
                  <NBadge size="xs" variant="primary" label={AR ? `+${partPoints(m.part, c.parts, c.weights)}٪` : `+${partPoints(m.part, c.parts, c.weights)}%`} />
                </Row>
              </NCard>
            ))}
            <Row>
              <NBtn size="sm" variant="outline" full={false} label={AR ? 'إعداد خدماتك' : 'Set up your services'} onPress={() => onNav('ordering_settings')} />
              <NBtn size="sm" variant="outline" full={false} label={AR ? 'فحوصي وأسعارها' : 'My tests and prices'} onPress={() => onNav('ordering_items')} />
            </Row>

            <Label bold>{AR ? 'كما يراك المريض' : 'How patients see you'}</Label>
            <Label sub>{AR ? 'معاينة لبطاقتك في نتائج البحث من بياناتك الحالية' : 'A preview of your card in search results from your current data'}</Label>
            <NCard>
              <Text style={{ fontSize: FS.lg, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left' }}>{user?.displayName || user?.name || ''}</Text>
              {s && <Label sub>{s.modes.map((m) => (m === 'home' ? (AR ? 'زيارة منزلية' : 'Home visit') : (AR ? 'في المنشأة' : 'At the facility'))).join(' · ')}</Label>}
              {s?.modes.includes('home') && <Label sub>{AR ? 'رسوم الزيارة ' : 'Visit fee '}{fmtMoney(s.home_fee, AR)}{' · '}{AR ? `${s.home_radius_km ?? '-'} كم` : `${s.home_radius_km ?? '-'} km`}</Label>}
              {fromPrice !== null && <Label>{AR ? 'ابتداءً من ' : 'From '}{fmtMoney(fromPrice, AR)}</Label>}
              <Label sub>{AR ? `${ins.companies} شركات تأمين · ${ins.classes} فئات` : `${ins.companies} insurers · ${ins.classes} classes`}</Label>
              <Label sub>{AR ? `${visible.length} فحصًا ظاهرًا للمريض` : `${visible.length} tests visible to patients`}</Label>
              {hidden > 0 && <Text style={{ color: theme.warn, fontSize: FS.sm, textAlign: AR ? 'right' : 'left' }}>{AR ? `${hidden} فحصًا بلا سعر لا تظهر للمريض` : `${hidden} tests without a price are hidden from patients`}</Text>}
              {s?.auto_accept && <NBadge size="xs" variant="success" label={AR ? 'قبول تلقائي' : 'Auto-accept'} />}
              {visible.slice(0, 3).map((i) => <Label key={i.catalog_id} sub>{itemName(i, AR)}</Label>)}
            </NCard>
          </View>
        )}
      </LoadState>
    </NScroll>
  );
}
