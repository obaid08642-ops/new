import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { router, type Href } from 'expo-router';

import { Card, EmptyState, FIcon } from '../../../packages/ui-native/src';
import { Gate, Section, goBack, useConsultFormat } from '../../src/components/consult/ConsultKit';
import { LAB_TONE } from '../../src/components/diagnostics/DiagKit';
import { HealthScreen, Pill, bodyOf, useRemote } from '../../src/components/health/HealthKit';
import { step as scale, useScreenUi } from '../../src/components/screen/ScreenKit';
import { apiFetch } from '../../src/utils/api';
import { type MedicalOrder, parseOrders } from '../../src/utils/medicalOrders';

/**
 * M6 Ord20 "طلباتي الطبية": the doctor's orders, valid first, expired below. GET /medical-orders/mine. A row opens the order.
 */
export default function MedicalOrdersScreen() {
  const { k, theme, t, c, flow } = useScreenUi();
  const fmt = useConsultFormat();
  const { status, data, reload } = useRemote(async () => parseOrders(bodyOf<unknown>(await apiFetch('/medical-orders/mine'))), [], 'medical-orders:list');
  const orders = data ?? [];
  const valid = orders.filter((o) => !o.expired);
  const expired = orders.filter((o) => o.expired);

  const row = (order: MedicalOrder) => (
    <Pressable
      key={order.id}
      accessibilityRole="button"
      accessibilityLabel={`${k('medorders.validUntil', { date: fmt.date(order.valid_until, true) })}${order.expires_soon ? `, ${k('medorders.expiresSoon')}` : ''}`}
      onPress={() => router.push({ pathname: '/medical-orders/[id]', params: { id: order.id } } as unknown as Href)}
      style={{ minHeight: 44 }}
    >
      <Card theme={theme}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <FIcon icon="test-tube" tone={LAB_TONE} size={44} theme={theme} />
          <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
            <Text style={{ ...scale(t, 'small', 'bold'), color: c.text.primary, ...flow }}>{k('medorders.validUntil', { date: fmt.date(order.valid_until, true) })}</Text>
            <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{groupsOf(k, order)}</Text>
          </View>
          {order.expires_soon ? <Pill label={k('medorders.expiresSoon')} tone="warning" /> : null}
        </View>
      </Card>
    </Pressable>
  );

  return (
    <HealthScreen title={k('medorders.title')} onBack={() => goBack('/(tabs)/consultations' as Href)} testID="medical-orders-screen">
      <Gate status={status} onRetry={() => void reload()} errorTitle={k('medorders.loadError')}>
        {orders.length === 0 ? (
          <EmptyState icon="test-tube" tone={LAB_TONE} title={k('medorders.emptyTitle')} body={k('medorders.emptyBody')} theme={theme} />
        ) : (
          <>
            {valid.length > 0 ? <Section title={k('medorders.tabValid')}>{valid.map(row)}</Section> : null}
            {expired.length > 0 ? <Section title={k('medorders.tabExpired')}>{expired.map(row)}</Section> : null}
          </>
        )}
      </Gate>
    </HealthScreen>
  );
}

function groupsOf(k: (key: string) => string, order: MedicalOrder): string {
  const names: string[] = [];
  if (order.groups.labs) names.push(k('medorders.group.labs'));
  if (order.groups.radiology) names.push(k('medorders.group.radiology'));
  if (order.groups.nursing) names.push(k('medorders.group.nursing'));
  if (order.groups.prescription) names.push(k('medorders.group.prescription'));
  return names.join(' · ');
}
