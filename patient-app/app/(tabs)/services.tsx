import React from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';

import { Icon, Screen, SectionHeader, ServiceTile, useTabBarHeight } from '../../../packages/ui-native/src';
import { HUB_COLUMN, Txt, useScreenUi, useTileColumns } from '../../src/components/home/homeKit';
import { ServiceRows } from '../../src/components/home/ServiceRows';
import { MAIN_SERVICES, MORE_SERVICES } from '../../src/features/services/catalog';
import { useModules } from '../../src/context/ModulesContext';
import { visibleItems } from '../../src/utils/moduleSwitches';

/**
 * Services — board ServiceHub (canvas/ServiceHub.dc.html). The board is the labs and radiology hub; this
 * screen takes its grammar: a 26/700 title with a pill link beside it, the 50 tall search pill, the soft
 * service tiles, and a white card of rows for the rest. The titles and routes are the ones the screen
 * already had.
 */
export default function ServicesScreen() {
  const { theme, c, tr } = useScreenUi();
  const barHeight = useTabBarHeight();
  const { disabled } = useModules();
  const mainServices = visibleItems(MAIN_SERVICES, (item) => item.route, disabled);
  const moreServices = visibleItems(MORE_SERVICES, (item) => item.route, disabled);
  const cols = useTileColumns();
  // the tiles sit two across on a phone and four across on a tablet
  const perRow = cols === 4 ? 4 : 2;
  const rows = [];
  for (let i = 0; i < mainServices.length; i += perRow) rows.push(mainServices.slice(i, i + perRow));

  return (
    <Screen scroll theme={theme} edges={['top', 'start', 'end']} bottomSpace={barHeight + 40}>
      <View style={{ ...HUB_COLUMN, paddingTop: 7, gap: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Txt accessibilityRole="header" weight="bold" size={26} style={{ flex: 1, letterSpacing: -0.3 }}>الخدمات</Txt>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={tr('طلباتي')}
            onPress={() => router.push('/orders')}
            style={{ minHeight: 44, paddingHorizontal: 14, borderRadius: 22, backgroundColor: c.bg.surface, borderWidth: 1, borderColor: c.border.onGlass, flexDirection: 'row', alignItems: 'center', gap: 6 }}
          >
            <Icon name="list" size={17} theme={theme} />
            <Txt weight="medium" size={13.5}>طلباتي</Txt>
          </Pressable>
        </View>

        <Pressable
          accessibilityRole="search"
          accessibilityLabel={tr('ابحث عن خدمة أو طبيب أو دواء')}
          onPress={() => router.push('/search')}
          style={{ minHeight: 50, borderRadius: 25, backgroundColor: c.bg.surface, borderWidth: 1, borderColor: c.border.onGlass, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16 }}
        >
          <Icon name="search" size={20} theme={theme} tone="secondary" />
          <Txt size={15} color={c.text.secondary} style={{ flex: 1 }}>ابحث عن خدمة أو طبيب أو دواء</Txt>
        </Pressable>

        {mainServices.length ? (
        <View style={{ gap: 10 }}>
          <SectionHeader title={tr('الخدمات الرئيسية')} theme={theme} />
          <View style={{ gap: 10 }}>
            {rows.map((row, r) => (
              <View key={r} style={{ flexDirection: 'row', gap: 10 }}>
                {Array.from({ length: perRow }).map((_, i) => {
                  const item = row[i];
                  return (
                    <View key={i} style={{ flex: 1 }}>
                      {item ? <ServiceTile name={item.service} label={tr(item.title)} badge={item.badge ? tr(item.badge) : undefined} theme={theme} onPress={() => router.push(item.route as never)} /> : null}
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
        </View>
        ) : null}

        {moreServices.length ? (
        <View style={{ gap: 10 }}>
          <SectionHeader title={tr('خدمات إضافية')} theme={theme} />
          <ServiceRows items={moreServices} />
        </View>
        ) : null}
      </View>
    </Screen>
  );
}
