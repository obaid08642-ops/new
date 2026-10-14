import React, { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { router, useLocalSearchParams, type Href } from 'expo-router';

import { Button } from '../../../packages/ui-native/src';
import { ConsultScreen, Gate, Section, type GateStatus } from '../../src/components/consult/ConsultKit';
import { Block, DetailHead, Price, Tag, goBackDiag } from '../../src/components/diagnostics/DiagKit';
import { serviceGlyph } from '../../src/components/nursing/NursingKit';
import { step as scale, useScreenUi } from '../../src/components/screen/ScreenKit';
import { apiFetch } from '../../src/utils/api';
import { isOffline } from '../../src/utils/isOffline';
import { logError } from '../../src/utils/logger';
import { pickDbField, pickLocalized } from '../../src/utils/localize';

type Rec = Record<string, unknown>;
const text = (v: unknown): string => (typeof v === 'string' || typeof v === 'number' ? String(v) : '');
const list = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x !== '') : []);

/** One nursing service: what it is, how long, whether insurance covers it, the preparation and the price with the way to book (board ServiceHub detail). */
export default function NursingServiceInfo() {
  const { theme, t, c, k, num, flow } = useScreenUi();
  const params = useLocalSearchParams<{ serviceId?: string; flow?: string; gender?: string; availability?: string; nationality?: string; search?: string }>();
  const { serviceId, flow: payFlow, gender, availability, nationality, search } = params;
  const [svc, setSvc] = useState<Rec | null>(null);
  const [status, setStatus] = useState<GateStatus>('loading');

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const res = await apiFetch<Rec | { data?: Rec }>(`/home-care/services/${serviceId}`);
      const one = ((res as { data?: Rec } | null)?.data ?? res) as Rec | null;
      setSvc(one);
      setStatus(one ? 'ready' : 'error');
    } catch (err) {
      logError('nursing:service-info', err);
      setStatus((await isOffline()) ? 'offline' : 'error');
    }
  }, [serviceId]);

  useEffect(() => {
    void load();
  }, [load]);

  const title = text(pickDbField(svc, 'name') ?? svc?.name_ar ?? svc?.name_en);
  const desc = text(pickDbField(svc, 'description'));
  const prep = pickLocalized(list(svc?.preparation_ar), list(svc?.preparation_en)) ?? [];
  const image = text(svc?.image_url ?? svc?.image);
  const price = svc?.price !== undefined && svc?.price !== null && Number.isFinite(Number(svc.price)) ? Number(svc.price) : null;
  const durationValue = Number(svc?.duration_value);
  const unit = text(svc?.duration);
  const duration = durationValue > 0 ? (unit === 'hour' ? k('nur.hours', { n: num(durationValue) }) : unit === 'day' ? k('nur.days', { n: num(durationValue) }) : `${num(durationValue)} ${unit}`.trim()) : '';
  const look = serviceGlyph(svc?.id);

  const goBook = () =>
    router.push({
      pathname: '/nursing/service-details',
      params: { serviceId, title, flow: payFlow || 'cash', gender: gender || 'any', availability: availability || 'any', nationality: nationality || 'any', search: search || '' },
    } as unknown as Href);

  const footer =
    svc && status === 'ready' ? (
      <>
        {price !== null ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <Text style={{ ...scale(t, 'small', 'regular'), color: c.text.secondary }}>{k('nur.info.price')}</Text>
            <Price amount={price} size="h3" />
          </View>
        ) : null}
        <Button theme={theme} size="lg" fullWidth label={k('nur.info.book')} onPress={goBook} />
      </>
    ) : undefined;

  return (
    <ConsultScreen testID="nursing-service-info" title={k('nur.info.title')} onBack={goBackDiag} footer={footer} onRefresh={() => void load()}>
      <Gate status={status} onRetry={() => void load()}>
        {svc ? (
          <>
            <DetailHead icon={look.icon} tone={look.tone} image={image || undefined} title={title} />
            {duration || svc.insurance_availability ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {duration ? <Tag label={duration} tone="neutral" /> : null}
                {svc.insurance_availability ? <Tag label={k('nur.info.insurance')} tone="blue" /> : null}
              </View>
            ) : null}
            {desc ? (
              <Section title={k('nur.info.about')}>
                <Block>
                  <Text style={{ ...scale(t, 'small', 'regular'), lineHeight: 24, color: c.text.secondary, ...flow }}>{desc}</Text>
                </Block>
              </Section>
            ) : null}
            {prep.length > 0 ? (
              <Section title={k('nur.info.prep')}>
                <Block gap={8}>
                  {prep.map((p, i) => (
                    <View key={`${p}-${i}`} style={{ flexDirection: 'row', gap: 8 }}>
                      <Text style={{ ...scale(t, 'small', 'bold'), color: c.text.link }}>•</Text>
                      <Text style={{ flex: 1, minWidth: 0, ...scale(t, 'small', 'regular'), lineHeight: 22, color: c.text.secondary, ...flow }}>{p}</Text>
                    </View>
                  ))}
                </Block>
              </Section>
            ) : null}
          </>
        ) : null}
      </Gate>
    </ConsultScreen>
  );
}
