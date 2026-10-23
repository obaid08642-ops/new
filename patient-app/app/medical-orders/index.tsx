import React, { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router, type Href } from 'expo-router';

import { Button, Card, EmptyState, FIcon, Segmented } from '../../../packages/ui-native/src';
import { Gate, goBack, useConsultFormat } from '../../src/components/consult/ConsultKit';
import { LAB_TONE } from '../../src/components/diagnostics/DiagKit';
import { HealthScreen, Pill, bodyOf, useRemote } from '../../src/components/health/HealthKit';
import { step as scale, useScreenUi } from '../../src/components/screen/ScreenKit';
import { apiFetch } from '../../src/utils/api';
import { GroupHeader, OrderItemLine } from '../../src/components/ordering/MedicalOrderKit';
import { type MedicalOrder, type OrderGroupKey, groupFlow, parseOrders } from '../../src/utils/medicalOrders';
import { useCatalogNames } from '../../src/utils/useCatalogNames';

/**
 * M6 Ord20 "طلباتي الطبية": the doctor's orders, valid first, expired below. GET /medical-orders/mine. A row opens the order.
 */
export default function MedicalOrdersScreen() {
  const { k, theme, t, c, flow, num } = useScreenUi();
  const fmt = useConsultFormat();
  const { status, data, reload } = useRemote(async () => parseOrders(bodyOf<unknown>(await apiFetch('/medical-orders/mine'))), [], 'medical-orders:list');
  const orders = useMemo(() => data ?? [], [data]);
  const valid = orders.filter((o) => !o.expired);
  const expired = orders.filter((o) => o.expired);
  const [tab, setTab] = useState<'valid' | 'expired'>('valid');
  const shown = tab === 'valid' && (valid.length > 0 || expired.length === 0) ? valid : tab === 'expired' ? expired : expired;
  const names = useCatalogNames(useMemo(() => orders.flatMap((o) => o.items), [orders]));
  const open = (order: MedicalOrder) => router.push({ pathname: '/medical-orders/[id]', params: { id: order.id } } as unknown as Href);

  // Ord20 board: one card per order (validity on top), then each group with its items and their status, and the group's Order button.
  const card = (order: MedicalOrder) => (
    <Card key={order.id} theme={theme} padding="md">
      <View style={{ gap: 12 }}>
        <Pressable accessibilityRole="button" accessibilityLabel={`${k('medorders.validUntil', { date: fmt.date(order.valid_until, true) })}${order.expires_soon ? `, ${k('medorders.expiresSoon')}` : ''}`} onPress={() => open(order)} style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <FIcon icon="stethoscope" tone="blue" size={44} theme={theme} />
          <Text style={{ flex: 1, minWidth: 0, ...scale(t, 'small', 'bold'), color: c.text.primary, ...flow }}>{k('medorders.validUntil', { date: fmt.date(order.valid_until, true) })}</Text>
          {order.expires_soon ? <Pill label={k('medorders.expiresSoon')} tone="warning" /> : null}
        </Pressable>
        {GROUPS.map((group) => {
          const block = order.groups[group];
          if (!block) return null;
          const items = block.items ?? [];
          return (
            <View key={group} style={{ gap: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: c.border.hairline }}>
              <GroupHeader group={group} title={k(`medorders.group.${group}`)} />
              {items.map((item) => (
                <OrderItemLine key={item.id} item={item} name={names[item.catalog_id] ?? k(`medorders.group.${item.group}`)} sessions={item.sessions ? `${k('medorders.sessions')}: ${num(item.sessions)}` : undefined} />
              ))}
              {!order.expired ? (
                group === 'prescription' ? (
                  <Button theme={theme} size="md" variant="outline" label={k('medorders.orderPrescription')} onPress={() => router.push(groupFlow('prescription', order) as unknown as Href)} />
                ) : items.some((i) => i.status === 'open') ? (
                  <Button theme={theme} size="md" variant="outline" label={k(`medorders.order.${group}`)} onPress={() => open(order)} />
                ) : null
              ) : null}
            </View>
          );
        })}
      </View>
    </Card>
  );

  return (
    <HealthScreen title={k('medorders.title')} onBack={() => goBack('/(tabs)/consultations' as Href)} testID="medical-orders-screen">
      <Gate status={status} onRetry={() => void reload()} errorTitle={k('medorders.loadError')}>
        {orders.length === 0 ? (
          <EmptyState icon="test-tube" tone={LAB_TONE} title={k('medorders.emptyTitle')} body={k('medorders.emptyBody')} theme={theme} />
        ) : (
          <>
            <Segmented
              theme={theme}
              label={k('medorders.title')}
              value={shown === expired && expired.length > 0 && !(tab === 'valid' && valid.length > 0) ? 'expired' : tab}
              onChange={(v) => setTab(v === 'expired' ? 'expired' : 'valid')}
              options={[{ value: 'valid', label: k('medorders.tabValid') }, { value: 'expired', label: k('medorders.tabExpired') }]}
            />
            {shown.map(card)}
          </>
        )}
      </Gate>
    </HealthScreen>
  );
}

const GROUPS: OrderGroupKey[] = ['labs', 'radiology', 'nursing', 'prescription'];
