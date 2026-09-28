import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useTheme, useLang } from '../context';
import { SP, FS, FW, R } from '../constants';
import client from '../api/client';

type Item = { id?: string; title_ar?: string; title_en?: string; image_url?: string; deep_link?: string };
type Section = { id?: string; title_ar?: string; title_en?: string; enabled?: boolean; items?: Item[] };

/** R6-5: provider home renders the admin-curated /content/home sections. */
export function HomeSections({ onNavigate }: { onNavigate?: (s: string, p?: any) => void }) {
  const { theme } = useTheme();
  const { lang } = useLang();
  const AR = lang === 'ar';
  const [sections, setSections] = useState<Section[]>([]);

  useEffect(() => {
    let cancelled = false;
    client.get('/content/home')
      .then((res: any) => {
        if (cancelled) return;
        const list = Array.isArray(res?.data?.sections) ? res.data.sections : Array.isArray(res?.sections) ? res.sections : [];
        setSections(list.filter((s: any) => s?.enabled !== false && Array.isArray(s?.items) && s.items.length > 0));
      })
      .catch(() => { if (!cancelled) setSections([]); });
    return () => { cancelled = true; };
  }, []);

  if (!sections.length) return null;
  return (
    <View>
      {sections.map((section, i) => (
        <View key={section.id || i} style={{ marginBottom: SP.lg }}>
          {!!(AR ? section.title_ar || section.title_en : section.title_en || section.title_ar) && (
            <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left', marginBottom: SP.sm }}>
              {AR ? section.title_ar || section.title_en : section.title_en || section.title_ar}
            </Text>
          )}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', gap: SP.md }}>
              {(section.items || []).map((item, j) => (
                <TouchableOpacity
                  key={item.id || j}
                  activeOpacity={0.85}
                  onPress={() => { if (item.deep_link && onNavigate) onNavigate(item.deep_link); }}
                  style={{ width: 220, backgroundColor: theme.surface, borderRadius: R.lg, padding: SP.md, borderWidth: 1, borderColor: theme.border }}
                >
                  {!!item.image_url && (
                    <Image source={{ uri: item.image_url }} style={{ width: '100%', height: 110, borderRadius: R.md }} resizeMode="cover" />
                  )}
                  <Text style={{ fontSize: FS.sm, fontWeight: FW.semi, color: theme.text, textAlign: AR ? 'right' : 'left', marginTop: SP.xs }}>
                    {AR ? item.title_ar || item.title_en : item.title_en || item.title_ar || ''}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      ))}
    </View>
  );
}
