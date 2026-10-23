import React, { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { router, useLocalSearchParams, type Href } from 'expo-router';

import { Button, Card, FIcon } from '../../../packages/ui-native/src';
import { Gate, InfoRow, goBack, useConsultFormat } from '../../src/components/consult/ConsultKit';
import { LAB_TONE } from '../../src/components/diagnostics/DiagKit';
import { HealthScreen, Pill, bodyOf, useRemote } from '../../src/components/health/HealthKit';
import { step as scale, useScreenUi } from '../../src/components/screen/ScreenKit';
import { apiFetch } from '../../src/utils/api';
import { GroupHeader, OrderItemLine } from '../../src/components/ordering/MedicalOrderKit';
import { type MedicalOrderItem, type OrderGroupKey, groupFlow, parseOrder } from '../../src/utils/medicalOrders';
import { useCatalogNames } from '../../src/utils/useCatalogNames';

/**
 * M6 Ord21 "تفاصيل الأمر الطبي": the groups of one order. "Order" per group prefills the flow of that group
 * (POST /medical-orders/:id/items/:itemId/order, group_all); "later" per item keeps it unordered (…/defer).
 * The order carries catalogue ids, not names, so an item shows its group and its sessions (needs-review).
 */
export default function MedicalOrderScreen() {
  const { k, theme, t, c, flow, num } = useScreenUi();
  const fmt = useConsultFormat();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<'order' | 'defer' | null>(null);
  const { status, data: order, reload } = useRemote(async () => {
    if (!id) throw new Error('missing_id');
    const parsed = parseOrder(bodyOf<unknown>(await apiFetch(`/medical-orders/${encodeURIComponent(String(id))}`)));
    if (!parsed) throw new Error('order_unreadable');
    return parsed;
  }, [id], 'medical-orders:detail');

  const act = async (item: MedicalOrderItem, action: 'order' | 'defer', groupAll: boolean) => {
    if (!order || busy) return;
    setBusy(true);
    setProblem(null);
    try {
      await apiFetch(`/medical-orders/${encodeURIComponent(order.id)}/items/${encodeURIComponent(item.id)}/${action}`, {
        method: 'POST',
        body: JSON.stringify(action === 'order' ? { group_all: groupAll } : {}),
      });
      if (action === 'order') {
        router.push(groupFlow(item.group, order) as unknown as Href);
      } else {
        await reload();
      }
    } catch {
      setProblem(action);
    } finally {
      setBusy(false);
    }
  };

  const names = useCatalogNames(useMemo(() => order?.items ?? [], [order]));
  const groups: OrderGroupKey[] = ['labs', 'radiology', 'nursing', 'prescription'];

  return (
    <HealthScreen title={k('medorders.detailTitle')} onBack={() => goBack('/medical-orders' as Href)} testID="medical-order-screen">
      <Gate status={status} onRetry={() => void reload()} errorTitle={k('medorders.loadError')}>
        {order ? (
          <>
            <Card theme={theme}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <FIcon icon="test-tube" tone={LAB_TONE} size={48} theme={theme} />
                <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                  <Text style={{ ...scale(t, 'bodyStrong', 'bold'), color: c.text.primary, ...flow }}>{k('medorders.detailTitle')}</Text>
                  {order.expires_soon ? <Pill label={k('medorders.expiresSoon')} tone="warning" /> : null}
                </View>
              </View>
              <View>
                <InfoRow label={k('medorders.validity')} value={fmt.date(order.valid_until, true)} last={!order.notes} />
                {order.notes ? <InfoRow label={k('medorders.doctorNote')} value={order.notes} last /> : null}
              </View>
            </Card>
            {order.expired ? (
              <Text style={{ ...scale(t, 'small', 'regular'), color: c.status.warning.fg, ...flow }}>{k('medorders.expiredNote')}</Text>
            ) : null}
            {groups.map((group) => {
              const block = order.groups[group];
              if (!block) return null;
              const items = block.items ?? [];
              const open = items.filter((i) => i.status === 'open');
              return (
                <Card key={group} theme={theme} padding="md">
                  <View style={{ gap: 12 }}>
                    <GroupHeader group={group} title={k(`medorders.group.${group}`)} />
                    {items.map((item) => (
                      <View key={item.id}>
                        <OrderItemLine item={item} name={names[item.catalog_id] ?? k(`medorders.group.${item.group}`)} sessions={item.sessions ? `${k('medorders.sessions')}: ${num(item.sessions)}` : undefined} />
                        {item.status === 'open' && !order.expired ? (
                          <Button label={k('medorders.later')} variant="secondary" onPress={() => void act(item, 'defer', false)} disabled={busy} theme={theme} />
                        ) : null}
                      </View>
                    ))}
                    {group === 'prescription' ? (
                      <Button
                        label={k('medorders.orderPrescription')}
                        disabled={order.expired}
                        onPress={() => router.push(groupFlow('prescription', order) as unknown as Href)}
                        theme={theme}
                      />
                    ) : open.length > 0 ? (
                      <>
                        <Button
                          label={order.expired ? k('medorders.expiredDisabled') : k(`medorders.order.${group}`)}
                          disabled={order.expired || busy}
                          loading={busy}
                          onPress={() => void act(open[0], 'order', true)}
                          theme={theme}
                        />
                        <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{k('medorders.selected', { a: open.length, b: items.length })}</Text>
                      </>
                    ) : null}
                  </View>
                </Card>
              );
            })}
            {problem ? (
              <Text accessibilityRole="alert" style={{ ...scale(t, 'small', 'regular'), color: c.status.danger.fg, ...flow }}>
                {problem === 'order' ? k('medorders.orderError') : k('medorders.deferError')}
              </Text>
            ) : null}
          </>
        ) : null}
      </Gate>
    </HealthScreen>
  );
}
