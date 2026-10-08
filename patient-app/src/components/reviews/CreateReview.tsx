import React, { useState } from 'react';
import { View, Text, TextInput, Image, TouchableOpacity, StyleSheet, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useApp } from '../../context/AppContext';
import { Button, Card } from '../../components/ui';
import { Spacing, BorderRadius } from '../../theme';
import { apiFetch } from '../../utils/api';
import * as ImagePicker from 'expo-image-picker';

interface CreateReviewProps {
  providerId: string;
  providerType: string;
  sourceType: 'order' | 'booking' | 'consultation';
  sourceId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function CreateReview({ providerId, providerType, sourceType, sourceId, onSuccess, onCancel }: CreateReviewProps) {
  const { colors: theme, lang } = useApp();
  const AR = lang === 'ar';

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const pickImages = async () => {
    if (photos.length >= 5) {
      Alert.alert(AR ? 'الحد الأقصى 5 صور' : 'Maximum 5 photos');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: 5 - photos.length,
      quality: 0.8,
    });
    if (!result.canceled && result.assets) {
      const uploaded = await Promise.all(result.assets.map(async (asset) => {
        const formData = new FormData();
        formData.append('file', {
          uri: asset.uri,
          name: asset.fileName || `photo_${Date.now()}.jpg`,
          type: asset.mimeType || 'image/jpeg',
        } as any);
        formData.append('purpose', 'review');
        const res = await apiFetch('/media/upload', { method: 'POST', body: formData });
        return res.id;
      }));
      setPhotos(prev => [...prev, ...uploaded]);
    }
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert(AR ? 'يرجى اختيار تقييم' : 'Please select a rating');
      return;
    }
    setSubmitting(true);
    try {
      await apiFetch('/orders/reviews', {
        method: 'POST',
        body: JSON.stringify({
          source_type: sourceType,
          source_id: sourceId,
          provider_id: providerId,
          provider_type: providerType,
          rating,
          comment: comment.trim(),
          photos,
        }),
      });
      Alert.alert(AR ? 'تم الإرسال' : 'Submitted', AR ? 'شكراً لتقييمك' : 'Thank you for your review');
      onSuccess();
    } catch (error: any) {
      Alert.alert(AR ? 'خطأ' : 'Error', error.message || (AR ? 'فشل الإرسال' : 'Failed to submit'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container} keyboardVerticalOffset={90}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={{ marginBottom: Spacing.lg }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: theme.textPrimary }}>{AR ? 'اكتب تقييمك' : 'Write your review'}</Text>
        </View>
        
        <Card style={styles.section}>
          <Text style={[styles.label, { color: theme.textPrimary, marginBottom: Spacing.sm }]}>{AR ? 'تقييمك' : 'Your rating'}</Text>
          <View style={styles.stars}>
            {[1, 2, 3, 4, 5].map((s) => (
              <TouchableOpacity key={s} onPress={() => setRating(s)} style={styles.starBtn}>
                <Text style={{ fontSize: 36, color: s <= rating ? theme.warning : theme.border }}>★</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={[styles.hint, { color: theme.textSecondary, marginTop: Spacing.xs }]}>{AR ? 'اسحب لتحديد التقييم' : 'Drag to set rating'}</Text>
        </Card>

        <Card style={[styles.section, { marginTop: Spacing.lg }]}>
          <Text style={[styles.label, { color: theme.textPrimary, marginBottom: Spacing.sm }]}>{AR ? 'تعليقك (اختياري)' : 'Your comment (optional)'}</Text>
          <TextInput
            style={[styles.textInput, { borderColor: theme.border }]}
            placeholder={AR ? 'شارك تجربتك...' : 'Share your experience...'}
            value={comment}
            onChangeText={setComment}
            multiline
            numberOfLines={5}
            placeholderTextColor={theme.textSecondary}
          />
        </Card>

        <Card style={[styles.section, { marginTop: Spacing.lg }]}>
          <View style={styles.photoRow}>
            <Text style={[styles.label, { color: theme.textPrimary }]}>{AR ? 'صور (اختياري، حتى 5)' : 'Photos (optional, up to 5)'}</Text>
            {photos.length < 5 && (
              <TouchableOpacity onPress={pickImages} style={styles.addPhotoBtn}>
                <Text style={{ color: theme.primary }}>{photos.length}/5 {AR ? 'إضافة' : 'Add'}</Text>
              </TouchableOpacity>
            )}
          </View>
          {photos.length > 0 && (
            <View style={styles.photoPreview}>
              {photos.map((photo, i) => (
                <View key={i} style={styles.photoThumb}>
                  <Image source={{ uri: photo }} style={styles.thumb} />
                  <TouchableOpacity onPress={() => setPhotos(prev => prev.filter((_, idx) => idx !== i))} style={styles.removeBtn}>
                    <Text>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </Card>

        <Button
          label={submitting ? (AR ? 'جاري الإرسال...' : 'Submitting...') : (AR ? 'إرسال التقييم' : 'Submit review')}
          onPress={handleSubmit}
          disabled={submitting || rating === 0}
          style={{ marginTop: Spacing.xl, marginBottom: Spacing.xl }}
        />
        <TouchableOpacity onPress={onCancel} style={{ marginBottom: Spacing.xl }}>
          <Text style={{ color: theme.textSecondary, textAlign: 'center' }}>{AR ? 'إلغاء' : 'Cancel'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  scrollContent: { padding: Spacing.md, paddingBottom: Spacing.xl },
  section: { marginBottom: 0 },
  label: { fontSize: 15, fontWeight: '500' },
  hint: { fontSize: 12 },
  textInput: { 
    borderWidth: 1, 
    borderRadius: 8, 
    padding: Spacing.md, 
    fontSize: 15, 
    minHeight: 100,
    textAlignVertical: 'top',
  },
  photoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  stars: { flexDirection: 'row', justifyContent: 'center', marginVertical: Spacing.sm },
  starBtn: { padding: Spacing.xs },
  addPhotoBtn: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderWidth: 1, borderColor: 'currentColor', borderRadius: 8 },
  photoPreview: { flexDirection: 'row', flexWrap: 'wrap', marginTop: Spacing.sm },
  photoThumb: { position: 'relative', marginRight: Spacing.sm, marginBottom: Spacing.sm },
  thumb: { width: 80, height: 80, borderRadius: 8 },
  removeBtn: { position: 'absolute', top: -8, right: -8, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 12, padding: 2 },
});
