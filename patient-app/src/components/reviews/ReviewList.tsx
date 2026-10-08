import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { useApp } from '../../context/AppContext';
import { Card } from '../../components/ui';
import { Spacing, BorderRadius } from '../../theme';
import { apiFetch } from '../../utils/api';

interface Review {
  id: string;
  provider_id: string;
  provider_type: string;
  rating: number;
  comment?: string;
  photos?: string[];
  status: string;
  provider_reply?: {
    content: string;
    replied_at: string;
  };
  helpful_votes: number;
  has_voted_helpful: boolean;
  createdAt: string;
}

export function ReviewList({ providerId, providerType }: { providerId: string; providerType: string }) {
  const { colors: theme, lang } = useApp();
  const AR = lang === 'ar';

  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadReviews = async () => {
    setLoading(true);
    try {
      const data = await apiFetch(`/orders/providers/${providerId}/${providerType}/reviews?status=published`);
      setReviews(data);
    } catch (error) {
      console.error('Failed to load reviews:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadReviews(); }, [providerId, providerType]);

  const onRefresh = () => { setRefreshing(true); loadReviews(); };

  const handleHelpfulVote = async (reviewId: string) => {
    try {
      await apiFetch(`/orders/reviews/${reviewId}/helpful`, { method: 'POST' });
      setReviews(prev => prev.map(r => 
        r.id === reviewId ? { ...r, helpful_votes: r.helpful_votes + 1, has_voted_helpful: true } : r
      ));
    } catch (error) {
      console.error('Failed to vote helpful:', error);
    }
  };

  const renderItem = ({ item }: { item: Review }) => (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View style={styles.starsRow}>
          {[1, 2, 3, 4, 5].map((s) => (
            <Text key={s} style={{ fontSize: 16, color: s <= item.rating ? theme.warning : theme.border }}>★</Text>
          ))}
        </View>
        <Text style={[styles.date, { color: theme.textSecondary }]}>{new Date(item.createdAt).toLocaleDateString(lang)}</Text>
      </View>
      {item.comment && <Text style={styles.comment}>{item.comment}</Text>}
      {item.photos && item.photos.length > 0 && (
        <View style={styles.photos}>
          {item.photos.map((photo, i) => (
            <Image key={i} source={{ uri: photo }} style={styles.photo} />
          ))}
        </View>
      )}
      {item.provider_reply && (
        <View style={styles.reply}>
          <Text style={[styles.replyLabel, { color: theme.primary }]}>{AR ? 'رد المزود:' : 'Provider reply:'}</Text>
          <Text style={styles.replyText}>{item.provider_reply.content}</Text>
          <Text style={[styles.replyDate, { color: theme.textSecondary }]}>{new Date(item.provider_reply.replied_at).toLocaleDateString(lang)}</Text>
        </View>
      )}
      <TouchableOpacity onPress={() => handleHelpfulVote(item.id)} style={styles.helpfulBtn} disabled={item.has_voted_helpful}>
        <Text style={[styles.helpfulText, { color: item.has_voted_helpful ? theme.primary : theme.textSecondary }]}>
          {AR ? 'مفيد' : 'Helpful'} ({item.helpful_votes})
        </Text>
      </TouchableOpacity>
    </Card>
  );

  if (loading) return <ActivityIndicator color={theme.primary} style={styles.center} />;

  return (
    <View style={styles.container}>
      <FlatList
        data={reviews}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} />}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', padding: Spacing.xl }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: theme.textPrimary }}>
              {AR ? 'لا توجد تقييمات بعد' : 'No reviews yet'}
            </Text>
            <Text style={{ fontSize: 14, color: theme.textSecondary, marginTop: Spacing.xs }}>
              {AR ? 'كن أول من يقيم هذا المزود' : 'Be the first to review this provider'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { padding: Spacing.md },
  card: { marginBottom: Spacing.md },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.sm },
  starsRow: { flexDirection: 'row' },
  date: { fontSize: 12 },
  comment: { marginBottom: Spacing.sm, fontSize: 15, lineHeight: 22 },
  photos: { flexDirection: 'row', marginBottom: Spacing.sm },
  photo: { width: 80, height: 80, borderRadius: BorderRadius.md, marginRight: Spacing.sm },
  reply: { marginTop: Spacing.md, padding: Spacing.md, backgroundColor: 'rgba(0,0,0,0.03)', borderRadius: BorderRadius.md },
  replyLabel: { fontWeight: '700', marginBottom: Spacing.xs },
  replyText: { marginBottom: Spacing.xs },
  replyDate: { fontSize: 12, textAlign: 'right' },
  helpfulBtn: { marginTop: Spacing.sm, paddingVertical: Spacing.xs },
  helpfulText: { fontSize: 14 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
