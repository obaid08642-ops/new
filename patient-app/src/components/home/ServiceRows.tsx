import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';

import { Card, ListItem, SectionHeader } from '../../../../packages/ui-native/src';
import type { ServiceRow } from '../../features/services/catalog';
import { useScreenUi } from './homeKit';

/**
 * A card of service rows (canvas/Account.dc.html, Settings.dc.html grammar, as ServiceHub's lists): one white
 * card, each row a ListItem with the service's filled icon, title and description and a chevron, a hairline
 * between rows. The titles and descriptions are Arabic source text and go through the six-language catalogue.
 */
export function ServiceRows({ items }: { items: ServiceRow[] }) {
  const { theme, c, tr } = useScreenUi();
  return (
    <Card padding="none" theme={theme}>
      <View style={{ paddingVertical: 4 }}>
        {items.map((item, i) => (
          <View key={`${item.route}-${item.title}`} style={i < items.length - 1 ? { borderBottomWidth: 1, borderBottomColor: c.border.subtle } : undefined}>
            <ListItem
              title={tr(item.title)}
              subtitle={tr(item.desc)}
              leading={{ icon: item.icon, tone: item.tone }}
              theme={theme}
              onPress={() => router.push(item.route as never)}
            />
          </View>
        ))}
      </View>
    </Card>
  );
}

/** A section title over a card of rows. */
export function ServiceGroup({ title, items }: { title: string; items: ServiceRow[] }) {
  const { theme, tr } = useScreenUi();
  return (
    <View style={{ gap: 10 }}>
      <SectionHeader title={tr(title)} theme={theme} />
      <ServiceRows items={items} />
    </View>
  );
}
