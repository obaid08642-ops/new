import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { router, useLocalSearchParams, type Href } from 'expo-router';

import { Button, Toggle } from '../../../packages/ui-native/src';
import { ConsultScreen, Gate, ResultHero, Section, type GateStatus } from '../../src/components/consult/ConsultKit';
import { AmountLine, Block, ListCard, Tag, goBackDiag } from '../../src/components/diagnostics/DiagKit';
import { Notice } from '../../src/components/pharmacy/OfferKit';
import { step as scale, useScreenUi } from '../../src/components/screen/ScreenKit';
import { apiFetch } from '../../src/utils/api';
import { logError } from '../../src/utils/logger';
import { recordOf } from '../../src/utils/labMappers';

type ApprovalState = 'pending' | 'full' | 'partial' | 'rejected';
type Rec = Record<string, unknown>;

interface ApprovalItem {
  id: string;
  name: string;
  price: number;
  covered: boolean;
  rejectReason: string;
}
interface ApprovalDetails {
  totalAmount: number;
  coveragePercent: number;
  coveredAmount: number;
  copayAmount: number;
  items: ApprovalItem[];
}

const str = (v: unknown): string => (typeof v === 'string' || typeof v === 'number' ? String(v) : '');
// The home-visit fee the screen has always added to the amount to pay (not sent by the server; see Needs review).
const HOME_VISIT_FEE = 50;

/** The lab's answer to an insurance request: waiting, then what is covered and what the patient pays (board CheckoutV2 totals). Polls every 3 seconds until answered. */
export default function InsuranceApproval() {
  const { theme, t, c, k, num, flow, money } = useScreenUi();
  const params = useLocalSearchParams<{ labName?: string; visitType?: string; orderId?: string }>();
  const labName = params.labName || k('diag.checkout.chosenLab');
  const visitType = params.visitType || 'clinic';
  const orderId = params.orderId;
  const [status, setStatus] = useState<ApprovalState>('pending');
  const [details, setDetails] = useState<ApprovalDetails | null>(null);
  const [optedInCashItems, setOptedInCashItems] = useState<string[]>([]); // ids of the items the patient chose to pay cash for
  const [insuranceRequestId, setInsuranceRequestId] = useState('');
  const [gate, setGate] = useState<GateStatus>('loading');

  useEffect(() => {
    if (!orderId) return;
    let intervalId: ReturnType<typeof setInterval> | undefined;
    let first = true;
    const fetchOrder = async () => {
      try {
        const data = recordOf(await apiFetch<unknown>(`/labs/bookings/${orderId}`));
        if (data && (data.insurance_status === 'approved' || data.insurance_status === 'partial_approval' || data.insurance_status === 'rejected')) {
          let newStatus: ApprovalState = 'full';
          if (data.insurance_status === 'partial_approval') newStatus = 'partial';
          if (data.insurance_status === 'rejected') newStatus = 'rejected';
          const rows = (Array.isArray(data.items) ? data.items : []) as Rec[];
          const totalAmount = rows.reduce((s, it) => s + (Number(it.price) || 0), 0);
          const copayAmount = Number(data.insurance_copay) || 0;
          const coveredAmount = Math.max(0, totalAmount - copayAmount);
          const coveragePercent = totalAmount > 0 ? Math.round((coveredAmount / totalAmount) * 100) : 0;
          if (data.insurance_request_id) setInsuranceRequestId(String(data.insurance_request_id));
          setStatus(newStatus);
          setDetails({
            totalAmount,
            coveragePercent,
            coveredAmount,
            copayAmount,
            items: rows.map((it) => ({
              id: str(it.service_id ?? it.id),
              name: str(it.name_ar ?? it.name_en ?? it.name),
              price: Number(it.cashPrice ?? it.price ?? 0) || 0,
              covered: Boolean(it.isCovered),
              rejectReason: str(it.rejectReason),
            })),
          });
          clearInterval(intervalId);
        }
        if (first) setGate('ready');
      } catch (err) {
        logError('diagnostics:insurance-approval', err);
        if (first) setGate('error');
      } finally {
        first = false;
      }
    };
    intervalId = setInterval(() => {
      void fetchOrder();
    }, 3000);
    return () => clearInterval(intervalId);
  }, [orderId]);

  useEffect(() => {
    // the first answer arrives with the first poll; with no order there is nothing to wait for
    if (!orderId) setGate('ready');
  }, [orderId]);

  const toggleCashItem = async (item: ApprovalItem) => {
    const identifier = item.id || item.name;
    const newOptIn = !optedInCashItems.includes(identifier);
    setOptedInCashItems((prev) => (newOptIn ? [...prev, identifier] : prev.filter((i) => i !== identifier)));
    try {
      if (orderId && item.id) {
        await apiFetch(`/labs/bookings/${orderId}/items/${item.id}/opt-in-cash`, { method: 'PATCH', body: JSON.stringify({ optInCash: newOptIn }) });
      }
    } catch (e) {
      logError('diagnostics:insurance-approval:opt-in', e);
      setOptedInCashItems((prev) => (!newOptIn ? [...prev, identifier] : prev.filter((i) => i !== identifier)));
    }
  };

  // The hybrid total: the co-pay, the items the patient pays cash for, and the home-visit fee
  let hybridCashAdditions = 0;
  if (details) {
    for (const item of details.items) {
      if (!item.covered && optedInCashItems.includes(item.id || item.name)) hybridCashAdditions += item.price;
    }
  }
  const finalTotalToPay = details ? details.copayAmount + hybridCashAdditions + (visitType === 'home' ? HOME_VISIT_FEE : 0) : 0;

  const hero =
    status === 'full'
      ? { icon: 'check-circle' as const, tone: 'success' as const, title: k('diag.ins.approved'), body: k('diag.ins.approvedBy', { lab: labName }) }
      : status === 'partial'
        ? { icon: 'shield-check' as const, tone: 'warning' as const, title: k('diag.ins.partial'), body: k('diag.ins.partialBody') }
        : status === 'rejected'
          ? { icon: 'x-circle' as const, tone: 'danger' as const, title: k('diag.ins.rejected'), body: k('diag.ins.rejectedBody') }
          : null;

  const footer =
    status === 'pending' ? undefined : status === 'rejected' ? (
      <>
        <Button
          theme={theme}
          size="lg"
          fullWidth
          label={k('diag.ins.payOwn')}
          onPress={() => router.push({ pathname: '/diagnostics/checkout', params: { visitType, isInsurance: 'false', total: (details?.totalAmount ?? 0) + (visitType === 'home' ? HOME_VISIT_FEE : 0) } } as unknown as Href)}
        />
        <Button theme={theme} size="lg" fullWidth variant="outline" label={k('diag.ins.consult')} onPress={() => router.push('/consultations' as Href)} />
      </>
    ) : (
      <Button
        theme={theme}
        size="lg"
        fullWidth
        label={k('diag.ins.continue')}
        onPress={() => {
          // pay the server-computed copay through the insurance engine when the request is linked; otherwise the local checkout
          if (insuranceRequestId) {
            router.push({ pathname: '/insurance/payment-split', params: { request_id: insuranceRequestId, booking_kind: 'lab' } } as unknown as Href);
            return;
          }
          router.push({ pathname: '/diagnostics/checkout', params: { visitType, isInsurance: 'hybrid', copay: finalTotalToPay } } as unknown as Href);
        }}
      />
    );

  return (
    <ConsultScreen testID="diagnostics-insurance-approval" title={k('diag.ins.title')} onBack={goBackDiag} footer={footer}>
      <Gate status={gate} onRetry={() => setGate('ready')}>
        {status === 'pending' ? <ResultHero icon="clipboard-text" tone="info" title={k('diag.ins.sent', { lab: labName })} body={k('diag.ins.reviewing')} /> : null}
        {status !== 'pending' && hero && details ? (
          <>
            <ResultHero icon={hero.icon} tone={hero.tone} title={hero.title} body={hero.body} />
            <Section title={k('diag.ins.details')}>
              <Block gap={0}>
                {details.items.map((item, idx) => {
                  const optedIn = optedInCashItems.includes(item.id || item.name);
                  return (
                    <View key={`${item.id}-${idx}`} style={{ paddingVertical: 12, gap: 8, borderBottomWidth: idx < details.items.length - 1 ? 1 : 0, borderBottomColor: c.border.hairline }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <Text style={{ flex: 1, minWidth: 0, ...scale(t, 'small', 'bold'), color: c.text.primary, ...flow }}>{item.name}</Text>
                        <Tag label={item.covered ? k('diag.ins.covered') : k('diag.ins.notCovered')} tone={item.covered ? 'mint' : 'neutral'} />
                        <Text style={{ ...scale(t, 'small', 'medium'), color: c.text.secondary }}>{money(item.price)} {k('pharmacy.currency')}</Text>
                      </View>
                      {!item.covered && status !== 'rejected' ? (
                        <View style={{ gap: 8 }}>
                          {item.rejectReason ? <Notice tone="danger" text={k('diag.ins.reason', { reason: item.rejectReason })} /> : null}
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                            <Text style={{ flex: 1, minWidth: 0, ...scale(t, 'meta', 'regular'), color: c.text.primary, ...flow }}>{k('diag.ins.payCash', { amount: `${money(item.price)} ${k('pharmacy.currency')}` })}</Text>
                            <Toggle theme={theme} value={optedIn} label={k('diag.ins.payCash', { amount: `${money(item.price)} ${k('pharmacy.currency')}` })} onChange={() => void toggleCashItem(item)} />
                          </View>
                        </View>
                      ) : null}
                    </View>
                  );
                })}
              </Block>
            </Section>
            {status !== 'rejected' ? (
              <ListCard>
                <View style={{ padding: 14, gap: 10 }}>
                  <AmountLine label={k('diag.ins.totalCost')} amount={details.totalAmount} />
                  <AmountLine label={k('diag.ins.covers', { pct: num(details.coveragePercent) })} amount={details.coveredAmount} success minus />
                  {visitType === 'home' ? <AmountLine label={k('diag.ins.homeFee')} amount={HOME_VISIT_FEE} /> : null}
                  {hybridCashAdditions > 0 ? <AmountLine label={k('diag.ins.extraCash')} amount={hybridCashAdditions} /> : null}
                  <View style={{ height: 1, backgroundColor: c.border.hairline }} />
                  <AmountLine label={k('diag.ins.toPay')} amount={finalTotalToPay} strong />
                </View>
              </ListCard>
            ) : null}
          </>
        ) : null}
      </Gate>
    </ConsultScreen>
  );
}
