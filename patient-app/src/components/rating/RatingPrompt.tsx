import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Alert } from 'react-native';
import { useApp } from '../../context/AppContext';
import { Button, Card } from '../../components/ui';
import { Spacing } from '../../theme';
import { apiFetch } from '../../utils/api';

type Trigger = 'order_delivered' | 'booking_completed' | 'prescription_filled' | 'refill_created';

interface RatingPromptProps {
  trigger: Trigger;
  onDismiss: () => void;
}

const TRIGGER_LABELS: Record<string, { ar: string; en: string }> = {
  order_delivered: { ar: 'تم تسليم طلبك', en: 'Your order was delivered' },
  booking_completed: { ar: 'اكتمل حجزك', en: 'Your booking was completed' },
  prescription_filled: { ar: 'تم صرف وصفتك', en: 'Your prescription was filled' },
  refill_created: { ar: 'تم إنشاء إعادة تعبئة', en: 'Your refill was created' },
};

export function RatingPrompt({ trigger, onDismiss }: RatingPromptProps) {
  const { colors: theme, lang } = useApp();
  const AR = lang === 'ar';

  const [rating, setRating] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) return;
    setSubmitting(true);
    try {
      await apiFetch('/release/rating-prompt/record', {
        method: 'POST',
        body: JSON.stringify({ app: 'patient-app', trigger, status: 'rated', rating }),
      });
      setSubmitted(true);
      setTimeout(() => onDismiss(), 1500);
    } catch (error) {
      console.error('Failed to record rating:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDismiss = (status: 'dismissed' | 'rate_later') => {
    apiFetch('/release/rating-prompt/record', {
      method: 'POST',
      body: JSON.stringify({ app: 'patient-app', trigger, status }),
    }).catch(() => {});
    onDismiss();
  };

  if (submitted) {
    return (
      <View style={styles.thanksContainer}>
        <Card style={styles.thanksCard}>
          <Text style={styles.thanksTitle}>{AR ? 'شكراً لتقييمك!' : 'Thank you for your rating!'}</Text>
          <Text style={styles.thanksSubtitle}>{AR ? 'نقدر وقتك ورأيك' : 'We appreciate your feedback'}</Text>
          <Button label={AR ? 'إغلاق' : 'Close'} onPress={onDismiss} style={{ marginTop: Spacing.lg }} />
        </Card>
      </View>
    );
  }

  const label = TRIGGER_LABELS[trigger] || { ar: 'تجربتك', en: 'Your experience' };

  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.title}>{AR ? label.ar : label.en}</Text>
          <TouchableOpacity onPress={() => handleDismiss('dismissed')} style={styles.closeBtn}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.question}>{AR ? 'كيف تقيم تجربتك؟' : 'How would you rate your experience?'}</Text>

        <View style={styles.stars}>
          {[1, 2, 3, 4, 5].map(star => (
            <TouchableOpacity key={star} onPress={() => setRating(star)} style={styles.starBtn}>
              <Text style={[
                styles.star, 
                { color: rating >= star ? theme.warning : theme.border }
              ]}>★</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Button 
          label={AR ? 'إرسال التقييم' : 'Submit rating'} 
          onPress={handleSubmit} 
          disabled={rating === 0 || submitting}
          style={{ marginTop: Spacing.lg }}
        />
        <TouchableOpacity onPress={() => handleDismiss('rate_later')} style={{ marginTop: Spacing.md }}>
          <Text style={styles.laterText}>{AR ? 'أقيم لاحقاً' : 'Rate later'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleDismiss('dismissed')} style={{ marginTop: Spacing.xs }}>
          <Text style={styles.dismissText}>{AR ? 'لا، شكراً' : 'No thanks'}</Text>
        </TouchableOpacity>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: Spacing.md, zIndex: 1000 },
  card: { borderRadius: 20, padding: Spacing.lg, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  title: { fontSize: 18, fontWeight: '700' },
  closeBtn: { padding: Spacing.xs },
  closeText: { fontSize: 22 },
  question: { fontSize: 15, marginBottom: Spacing.lg, textAlign: 'center', color: 'rgba(0,0,0,0.7)' },
  stars: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.md, marginBottom: Spacing.lg },
  starBtn: { padding: Spacing.xs },
  star: { fontSize: 36 },
  thanksContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: Spacing.md, zIndex: 1000 },
  thanksCard: { borderRadius: 20, padding: Spacing.xl, alignItems: 'center' },
  thanksTitle: { fontSize: 22, fontWeight: '700', marginBottom: Spacing.sm },
  thanksSubtitle: { color: 'rgba(0,0,0,0.6)' },
  laterText: { textAlign: 'center', color: 'rgba(0,0,0,0.5)' },
  dismissText: { textAlign: 'center', color: 'rgba(0,0,0,0.4)' },
});
