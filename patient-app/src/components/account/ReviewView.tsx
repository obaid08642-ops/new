import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { Button, Card, Input } from '../../../../packages/ui-native/src';
import { ResultHero, Section, goBack } from '../consult/ConsultKit';
import { Notice, Panel } from '../health/HealthKit';
import { step as scale, useScreenUi } from '../screen/ScreenKit';
import { apiFetch } from '../../utils/api';
import { logError } from '../../utils/logger';
import { AccountScreen, StarRating, ToggleRow } from './AccountKit';

/**
 * Rate a service (`/reviews`): the overall stars, four aspects, a comment and "publish anonymously", sent with POST /patient-ux/review.
 * The booking comes from the route (`booking_kind`, `booking_id` or `appointmentId`; the provider's name is `providerName` or
 * `doctorName`). Without a booking nothing is sent. The form closes by itself after the thanks.
 */

const ASPECTS = ['accuracy', 'clarity', 'care', 'speed'] as const;

export function ReviewView() {
  const params = useLocalSearchParams<{ booking_kind?: string; booking_id?: string; appointmentId?: string; providerName?: string; doctorName?: string }>();
  const { k, theme, t, c, flow } = useScreenUi();
  const [overall, setOverall] = useState(0);
  const [aspects, setAspects] = useState<Record<string, number>>({});
  const [comment, setComment] = useState('');
  const [anonymous, setAnonymous] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bookingKind = params.booking_kind || 'appointment';
  const bookingId = params.booking_id || params.appointmentId || '';
  const provider = params.providerName || params.doctorName || '';

  useEffect(() => {
    if (!sent) return;
    const timer = setTimeout(() => goBack(), 1500);
    return () => clearTimeout(timer);
  }, [sent]);

  const submit = async () => {
    if (overall === 0 || sending) return;
    if (!bookingId) {
      setError(k('reviews.noBooking'));
      return;
    }
    setSending(true);
    setError(null);
    try {
      await apiFetch('/patient-ux/review', { method: 'POST', body: JSON.stringify({ booking_kind: bookingKind, booking_id: bookingId, rating: overall, comment, aspects, anonymous }) });
      setSent(true);
    } catch (e) {
      logError('reviews:submit', e);
      setError(k('reviews.failed'));
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <AccountScreen title={k('reviews.title')} onBack={() => router.back()} testID="reviews-screen">
        <ResultHero icon="check-circle" title={k('reviews.thanks')} body={k('reviews.thanksBody')} />
      </AccountScreen>
    );
  }
  return (
    <AccountScreen title={k('reviews.title')} footer={<Button label={k('reviews.send')} size="lg" fullWidth disabled={overall === 0} loading={sending} onPress={() => void submit()} theme={theme} testID="reviews-send" />} testID="reviews-screen">
      {provider ? <Text style={{ ...scale(t, 'bodyStrong'), color: c.text.primary, ...flow }}>{provider}</Text> : null}
      <Card theme={theme}>
        <View style={{ alignItems: 'center', gap: 6 }}>
          <Text accessibilityRole="header" style={{ ...scale(t, 'bodyStrong'), color: c.text.primary }}>{k('reviews.overall')}</Text>
          <StarRating value={overall} onChange={setOverall} label={k('reviews.overall')} testID="reviews-overall" />
          {overall > 0 ? <Text style={{ ...scale(t, 'small', 'medium'), color: c.text.secondary }}>{k(`reviews.level.${overall}`)}</Text> : null}
        </View>
      </Card>
      <Section title={k('reviews.aspects')}>
        <Card theme={theme} padding="none">
          {ASPECTS.map((code, i) => (
            <View key={code} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 6, paddingHorizontal: 14, borderBottomWidth: i === ASPECTS.length - 1 ? 0 : 1, borderBottomColor: c.border.hairline }}>
              <Text style={{ ...scale(t, 'small', 'medium'), color: c.text.primary, flexShrink: 1, ...flow }}>{k(`reviews.aspect.${code}`)}</Text>
              <StarRating value={aspects[code] ?? 0} onChange={(n) => setAspects((current) => ({ ...current, [code]: n }))} label={k(`reviews.aspect.${code}`)} size={20} testID={`reviews-aspect-${code}`} />
            </View>
          ))}
        </Card>
      </Section>
      <Input label={k('reviews.comment')} placeholder={k('reviews.placeholder')} value={comment} onChange={setComment} multiline rows={4} theme={theme} testID="reviews-comment" />
      <Panel>
        <ToggleRow label={k('reviews.anonymous')} value={anonymous} onChange={setAnonymous} last testID="reviews-anonymous" />
      </Panel>
      {error ? <Notice tone="danger" text={error} /> : null}
    </AccountScreen>
  );
}
