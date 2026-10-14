import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router, useLocalSearchParams, type Href } from 'expo-router';

import { Button, Chip, Input } from '../../../packages/ui-native/src';
import { ConsultScreen } from '../../src/components/consult/ConsultKit';
import { Glyph } from '../../src/components/pharmacy/PharmacyKit';
import { step as scale, useScreenUi } from '../../src/components/screen/ScreenKit';
import { showLocalizedAlert } from '../../src/components/LocalizedAlert';
import { apiFetch } from '../../src/utils/api';

/**
 * Rate the consultation — board Consult's form language. Stars, an optional comment and the aspects the patient liked go
 * to POST /patient-ux/review for the appointment, as before; the aspects are stored with their Arabic words, the way the
 * server has always received them.
 */

const TAGS = [
  { id: 'excellent', stored: 'ممتاز' }, // i18n-ok: the aspect as stored on the server, not shown to the user
  { id: 'fast', stored: 'سريع' }, // i18n-ok: stored value
  { id: 'professional', stored: 'احترافي' }, // i18n-ok: stored value
  { id: 'clean', stored: 'نظيف' }, // i18n-ok: stored value
  { id: 'helpful', stored: 'متعاون' }, // i18n-ok: stored value
  { id: 'recommend', stored: 'أنصح به' }, // i18n-ok: stored value
] as const;

export default function PostCallRatingScreen() {
  const { appointmentId } = useLocalSearchParams();
  const { theme, t, c, k } = useScreenUi();

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [active, setActive] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const toggle = (id: string) => setActive((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  const home = () => router.replace('/(tabs)/consultations' as Href);

  const submit = async () => {
    if (rating === 0) return;
    setLoading(true);
    try {
      if (appointmentId) {
        await apiFetch('/patient-ux/review', {
          method: 'POST',
          body: JSON.stringify({ booking_kind: 'appointment', booking_id: String(appointmentId), rating, comment, aspects: TAGS.filter((x) => active.includes(x.id)).map((x) => x.stored) }),
        });
      }
      setLoading(false);
      home();
    } catch (e) {
      setLoading(false);
      showLocalizedAlert(k('consult.rate.failed'), (e instanceof Error && e.message) || k('consult.confirm.tryLater'));
    }
  };

  return (
    <ConsultScreen
      title={k('consult.rate.title')}
      onBack={home}
      footer={<Button label={k('consult.rate.submit')} size="lg" fullWidth disabled={rating === 0 || loading} loading={loading} onPress={() => void submit()} theme={theme} testID="rate-submit" />}
      testID="post-call-rating-screen"
    >
      <View style={{ alignItems: 'center', gap: 8, paddingTop: 16 }}>
        <Text accessibilityRole="header" style={{ ...scale(t, 'h2'), color: c.text.primary, textAlign: 'center' }}>{k('consult.rate.question')}</Text>
        <Text style={{ ...scale(t, 'small', 'regular'), color: c.text.secondary, textAlign: 'center' }}>{k('consult.rate.help')}</Text>
        <View accessibilityRole="radiogroup" accessibilityLabel={k('consult.rate.title')} style={{ flexDirection: 'row', gap: 6, marginTop: 12 }}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Pressable key={n} accessibilityRole="radio" accessibilityState={{ selected: n === rating }} accessibilityLabel={k(`consult.rate.star${n}`)} onPress={() => setRating(n)} style={{ width: 52, height: 52, alignItems: 'center', justifyContent: 'center' }}>
              <Glyph name="star" size={40} color={n <= rating ? c.icon.ratingStar : c.border.strong} />
            </Pressable>
          ))}
        </View>
        <Text accessibilityLiveRegion="polite" style={{ ...scale(t, 'small', 'bold'), color: c.text.secondary, minHeight: 22 }}>{rating > 0 ? k(`consult.rate.star${rating}`) : ''}</Text>
      </View>

      <Input label={k('consult.rate.comment')} placeholder={k('consult.rate.commentPlaceholder')} value={comment} onChange={setComment} multiline rows={4} theme={theme} testID="rate-comment" />

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {TAGS.map((tag) => (
          <Chip key={tag.id} label={k(`consult.rate.tag.${tag.id}`)} selected={active.includes(tag.id)} onPress={() => toggle(tag.id)} theme={theme} />
        ))}
      </View>
    </ConsultScreen>
  );
}
