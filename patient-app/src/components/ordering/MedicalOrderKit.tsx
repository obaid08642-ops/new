import React from 'react';
import { Text, View } from 'react-native';

import { FIcon, type FillIconName, type ServiceTone } from '../../../../packages/ui-native/src';
import { Tag } from '../diagnostics/DiagKit';
import { step as scale, useScreenUi } from '../screen/ScreenKit';
import type { MedicalOrderItem, OrderGroupKey, OrderItemStatus } from '../../utils/medicalOrders';

/** Boards Ord20 and Ord21: the glyph and tone of each group of a medical order. */
export const GROUP_LOOK: Record<OrderGroupKey, { icon: FillIconName; tone: ServiceTone }> = {
  labs: { icon: 'test-tube', tone: 'mint' },
  radiology: { icon: 'scan', tone: 'violet' },
  nursing: { icon: 'syringe', tone: 'blue' },
  prescription: { icon: 'pill', tone: 'amber' },
};

const STATUS_TONE: Record<OrderItemStatus, ServiceTone | 'neutral'> = { open: 'neutral', ordered: 'blue', later: 'neutral' };

/** The title line of a group: its glyph tile and name. */
export function GroupHeader({ group, title }: { group: OrderGroupKey; title: string }) {
  const { theme, t, c, flow } = useScreenUi();
  const look = GROUP_LOOK[group];
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <FIcon icon={look.icon} tone={look.tone} size={36} theme={theme} />
      <Text accessibilityRole="header" style={{ flex: 1, minWidth: 0, ...scale(t, 'bodyStrong', 'bold'), color: c.text.primary, ...flow }}>{title}</Text>
    </View>
  );
}

/** One item of an order: its name (the catalogue's, else the caller's fallback) and its status chip. */
export function OrderItemLine({ item, name, sessions }: { item: MedicalOrderItem; name: string; sessions?: string }) {
  const { t, c, k, flow } = useScreenUi();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 }}>
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text style={{ ...scale(t, 'small', 'bold'), color: c.text.primary, ...flow }}>{name}</Text>
        {sessions ? <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{sessions}</Text> : null}
      </View>
      <Tag label={k(`medorders.st.${item.status}`)} tone={STATUS_TONE[item.status]} />
    </View>
  );
}
