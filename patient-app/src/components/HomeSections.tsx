// R6-5: home screen renders the admin-curated /content/home sections (banners).
// Drawn as the "offers and packages" carousel of canvas/HomeApp.dc.html: 236-wide cards, a 112 tall image
// area, the title under it. The content has no price or provider, so the card shows none.
import React, { useEffect, useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';

import { FIcon, SectionHeader } from '../../../packages/ui-native/src';
import { apiFetch } from '../utils/api';
import { internalRoute } from '../utils/deepLinks';
import { Plain, useScreenUi } from './home/homeKit';
import { useModules } from '../context/ModulesContext';

type Item = { id?: string; title_ar?: string; title_en?: string; image_url?: string; deep_link?: string };
type Section = { id?: string; type?: string; title_ar?: string; title_en?: string; enabled?: boolean; items?: Item[] };

const CARD_WIDTH = 236;
const IMAGE_HEIGHT = 112;

export default function HomeSections() {
  const { theme, t, c, lang } = useScreenUi();
  const [allSections, setSections] = useState<Section[]>([]);
  const { isHidden } = useModules();
  // curated cards that open a switched-off module are not drawn (#953)
  const sections = allSections
    .map((s) => ({ ...s, items: (s.items || []).filter((item) => !isHidden(internalRoute(item.deep_link))) }))
    .filter((s) => s.items.length > 0);

  useEffect(() => {
    let cancelled = false;
    apiFetch('/content/home')
      .then((res: { sections?: Section[] } | null) => {
        if (cancelled) return;
        const list: Section[] = Array.isArray(res?.sections) ? res.sections : [];
        setSections(list.filter((s) => s?.enabled !== false && Array.isArray(s?.items) && s.items.length > 0));
      })
      .catch(() => { if (!cancelled) setSections([]); });
    return () => { cancelled = true; };
  }, []);

  if (!sections.length) return null;
  const pick = (ar?: string, en?: string) => (lang === 'ar' ? ar || en : en || ar) || '';

  return (
    <>
      {sections.map((section, i) => {
        const title = pick(section.title_ar, section.title_en);
        return (
          <View key={section.id || i} style={{ gap: 10 }}>
            {title ? <SectionHeader title={title} theme={theme} /> : null}
            <FlatList
              horizontal
              data={section.items || []}
              keyExtractor={(item, j) => item.id || String(j)}
              showsHorizontalScrollIndicator={false}
              style={{ marginHorizontal: -16 }}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
              renderItem={({ item }) => {
                const label = pick(item.title_ar, item.title_en);
                // the admin types the link: only a known internal path of the app opens; anything else is a card with no tap
                const target = internalRoute(item.deep_link);
                return (
                  <Pressable
                    accessibilityRole={target ? 'link' : undefined}
                    accessibilityLabel={label || undefined}
                    disabled={!target}
                    onPress={() => { if (target) router.push(target as never); }}
                    style={({ pressed }) => ({
                      width: CARD_WIDTH,
                      borderRadius: 24,
                      backgroundColor: c.bg.surface,
                      borderWidth: 1,
                      borderColor: c.border.hairline,
                      boxShadow: t.shadow.card,
                      overflow: 'hidden',
                      transform: [{ scale: pressed ? 0.98 : 1 }],
                    })}
                  >
                    <View style={{ width: CARD_WIDTH, height: IMAGE_HEIGHT, backgroundColor: c.service.blue.bg, alignItems: 'center', justifyContent: 'center' }}>
                      {item.image_url ? (
                        <Image source={{ uri: item.image_url }} contentFit="cover" accessibilityIgnoresInvertColors style={{ width: CARD_WIDTH, height: IMAGE_HEIGHT }} />
                      ) : (
                        <FIcon icon="tag" tone="blue" chip="none" size={56} theme={theme} />
                      )}
                    </View>
                    {label ? (
                      <View style={{ paddingVertical: 12, paddingHorizontal: 14 }}>
                        <Plain weight="bold" size={14.5} numberOfLines={2}>{label}</Plain>
                      </View>
                    ) : null}
                  </Pressable>
                );
              }}
            />
          </View>
        );
      })}
    </>
  );
}
