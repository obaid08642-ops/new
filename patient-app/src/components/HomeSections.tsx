// @ts-nocheck
// R6-5: home screen renders the admin-curated /content/home sections (banners).
import React, { useEffect, useState } from 'react';
import { View, Image, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useApp } from '../context/AppContext';
import { AppText, Card } from './ui';
import { apiFetch } from '../utils/api';

type Item = { id?: string; title_ar?: string; title_en?: string; image_url?: string; deep_link?: string };
type Section = { id?: string; type?: string; title_ar?: string; title_en?: string; enabled?: boolean; items?: Item[] };

export default function HomeSections() {
  const { colors, lang } = useApp();
  const [sections, setSections] = useState<Section[]>([]);

  useEffect(() => {
    let cancelled = false;
    apiFetch('/content/home')
      .then((res: any) => {
        if (cancelled) return;
        const list = Array.isArray(res?.sections) ? res.sections : [];
        setSections(list.filter((s: any) => s?.enabled !== false && Array.isArray(s?.items) && s.items.length > 0));
      })
      .catch(() => { if (!cancelled) setSections([]); });
    return () => { cancelled = true; };
  }, []);

  if (!sections.length) return null;
  const titleOf = (s: Section) => (lang === 'ar' ? s.title_ar || s.title_en : s.title_en || s.title_ar) || '';

  return (
    <View>
      {sections.map((section, i) => (
        <View key={section.id || i} style={{ marginBottom: 16 }}>
          {!!titleOf(section) && (
            <AppText variant="h5" color={colors.textPrimary} style={{ marginBottom: 8, textAlign: 'right' }}>
              {titleOf(section)}
            </AppText>
          )}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              {(section.items || []).map((item, j) => (
                <TouchableOpacity
                  key={item.id || j}
                  activeOpacity={0.85}
                  onPress={() => { if (item.deep_link) router.push(item.deep_link as any); }}
                >
                  <Card style={{ width: 220, gap: 8 }}>
                    {!!item.image_url && (
                      <Image source={{ uri: item.image_url }} style={{ width: '100%', height: 110, borderRadius: 12 }} resizeMode="cover" />
                    )}
                    <AppText variant="labelMD" color={colors.textPrimary} style={{ textAlign: 'right' }}>
                      {lang === 'ar' ? item.title_ar || item.title_en : item.title_en || item.title_ar || ''}
                    </AppText>
                  </Card>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      ))}
    </View>
  );
}
