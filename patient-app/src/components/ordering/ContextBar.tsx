import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router, type Href } from 'expo-router';

import { Button, FIcon, Radio } from '../../../../packages/ui-native/src';
import { Sheet } from '../consult/ConsultKit';
import { LAB_TONE } from '../diagnostics/DiagKit';
import { step as scale, useScreenUi } from '../screen/ScreenKit';
import { formatAddressLine } from '../../utils/selectedAddress';
import { isNewPatient, markContextSkipped, readContextSkipped } from '../../utils/orderingContextPrefs';
import type { useOrderingContext } from '../../utils/useOrderingContext';

type Ctx = ReturnType<typeof useOrderingContext>;
type Open = 'where' | 'pay' | 'who' | null;

const ADDRESSES = '/profile/addresses' as Href;
const ADD_POLICY = '/insurance/add-policy' as Href;
const ADD_MEMBER = '/family/add' as Href;

/**
 * Ord01 context bar: place, payer and for whom as three chips; a chip opens the bottom sheet with the choices read from the
 * profile (addresses, saved insurance, family). Changing a choice changes `ctx.body`, so the quote of the screen is asked again.
 */
export function ContextBar({ ctx }: { ctx: Ctx }) {
  const { theme, t, c, k, flow, dir } = useScreenUi();
  const [open, setOpen] = useState<Open>(null);
  const [changed, setChanged] = useState(false);
  const policy = ctx.profile?.policy ?? null;
  const members = ctx.profile?.members ?? [];
  const memberName = ctx.choice.memberId ? members.find((m) => m.id === ctx.choice.memberId)?.name ?? null : null;
  const placeLine = ctx.place ? formatAddressLine(ctx.place) : '';
  const payValue = ctx.payer === 'insurance' && policy ? `${policy.company} · ${policy.cls}` : k('ordering.ctx.valCash');
  const whereValue = ctx.choice.mode === 'home' ? (placeLine || k('ordering.ctx.setWhere')) : k('ordering.ctx.valGo');
  const pick = (fn: () => void) => () => { fn(); setChanged(true); setOpen(null); };
  const go = (href: Href) => () => { setOpen(null); router.push(href); };

  const chip = (key: Exclude<Open, null>, icon: 'map-pin' | 'credit-card' | 'users', label: string, value: string) => (
    <Pressable
      key={key}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}`}
      onPress={() => setOpen(key)}
      testID={`ordering-ctx-${key}`}
      style={{ flexGrow: 1, flexBasis: 0, minWidth: 96, minHeight: 56, borderRadius: 20, borderWidth: 1, borderColor: c.border.hairline, backgroundColor: c.bg.surface, paddingHorizontal: 12, paddingVertical: 8, gap: 2, justifyContent: 'center' }}
    >
      <Text style={{ ...scale(t, 'tag', 'regular'), color: c.text.secondary, ...flow }}>{label}</Text>
      <Text numberOfLines={1} style={{ ...scale(t, 'meta', 'bold'), color: c.text.primary, ...flow }}>{value}</Text>
    </Pressable>
  );
  const closeLabel = k('ordering.ctx.close');
  const section = (title: string, children: React.ReactNode) => (
    <View style={{ gap: 6 }}>
      <Text accessibilityRole="header" style={{ ...scale(t, 'bodyStrong', 'bold'), color: c.text.primary, ...flow }}>{title}</Text>
      {children}
    </View>
  );

  return (
    <View accessibilityLabel={k('ordering.ctx.aria')} style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {chip('where', 'map-pin', k('ordering.ctx.lblWhere'), whereValue)}
        {chip('pay', 'credit-card', k('ordering.ctx.lblPay'), payValue)}
        {chip('who', 'users', k('ordering.ctx.lblWho'), memberName ?? k('ordering.ctx.valMe'))}
      </View>
      <Text accessibilityLiveRegion="polite" style={{ ...scale(t, 'tag', 'regular'), color: c.text.secondary, ...flow }}>{changed ? k('ordering.ctx.toast') : k('ordering.ctx.hint')}</Text>
      <Sheet open={open !== null} title={k('ordering.ctx.sheetTitle')} onClose={() => setOpen(null)} closeLabel={closeLabel}>
        {open === 'where' ? section(k('ordering.ctx.secWhere'), (
          <>
            <Radio theme={theme} direction={dir} label={k('ordering.ctx.optHome')} meta={placeLine || undefined} selected={ctx.choice.mode === 'home'} onChange={pick(() => ctx.setMode('home'))} divider />
            <Radio theme={theme} direction={dir} label={k('ordering.ctx.optGo')} selected={ctx.choice.mode === 'facility'} onChange={pick(() => ctx.setMode('facility'))} />
            <Button theme={theme} size="md" variant="outline" label={k('ordering.ctx.addrAdd')} onPress={go(ADDRESSES)} testID="ordering-ctx-add-address" />
          </>
        )) : null}
        {open === 'pay' ? section(k('ordering.ctx.secPay'), (
          <>
            {policy ? <Radio theme={theme} direction={dir} label={`${policy.company} · ${policy.cls}`} meta={k('ordering.ctx.payInsSub')} selected={ctx.payer === 'insurance'} onChange={pick(() => ctx.setPayer('insurance'))} divider /> : null}
            <Radio theme={theme} direction={dir} label={k('ordering.ctx.payCash')} selected={ctx.payer === 'cash'} onChange={pick(() => ctx.setPayer('cash'))} />
            <Button theme={theme} size="md" variant="outline" label={policy ? k('ordering.ctx.payAdd') : k('ordering.ctx.setPay')} onPress={go(ADD_POLICY)} testID="ordering-ctx-add-insurance" />
          </>
        )) : null}
        {open === 'who' ? section(k('ordering.ctx.secWho'), (
          <>
            <Radio theme={theme} direction={dir} label={k('ordering.ctx.valMe')} selected={ctx.choice.memberId === null} onChange={pick(() => ctx.setMember(null))} divider={members.length > 0} />
            {members.map((m, i) => (
              <Radio key={m.id} theme={theme} direction={dir} label={m.name} selected={ctx.choice.memberId === m.id} onChange={pick(() => ctx.setMember(m.id))} divider={i < members.length - 1} />
            ))}
            <Button theme={theme} size="md" variant="outline" label={k('ordering.ctx.whoAdd')} onPress={go(ADD_MEMBER)} testID="ordering-ctx-add-member" />
          </>
        )) : null}
      </Sheet>
    </View>
  );
}

/** The first-ask for a new patient with nothing saved: three short ways to set the context, once, with a skip that is remembered on the device. */
export function FirstAskSheet({ ctx, onDone }: { ctx: Ctx; onDone: () => void }) {
  const { theme, t, c, k, flow } = useScreenUi();
  const go = (href: Href) => () => { onDone(); router.push(href); };
  const row = (icon: 'map-pin' | 'credit-card' | 'users', label: string, href: Href, testID: string) => (
    <Pressable key={testID} accessibilityRole="button" accessibilityLabel={label} onPress={go(href)} testID={testID} style={{ minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 20, borderWidth: 1, borderColor: c.border.hairline, backgroundColor: c.bg.surface, paddingHorizontal: 12 }}>
      <FIcon icon={icon} tone={LAB_TONE} size={40} theme={theme} />
      <Text style={{ flex: 1, minWidth: 0, ...scale(t, 'small', 'bold'), color: c.text.primary, ...flow }}>{label}</Text>
    </Pressable>
  );
  return (
    <Sheet open title={k('ordering.ctx.newTitle')} onClose={() => { void markContextSkipped(); onDone(); }} closeLabel={k('ordering.ctx.close')}>
      <Text style={{ ...scale(t, 'small', 'regular'), color: c.text.secondary, ...flow }}>{k('ordering.ctx.newSub')}</Text>
      {row('map-pin', k('ordering.ctx.newAddr'), ADDRESSES, 'ordering-first-address')}
      {row('credit-card', k('ordering.ctx.newPay'), ADD_POLICY, 'ordering-first-pay')}
      {row('users', k('ordering.ctx.newWho'), ADD_MEMBER, 'ordering-first-who')}
      <Button theme={theme} size="md" variant="outline" label={k('ordering.ctx.skip')} onPress={() => { void markContextSkipped(); onDone(); }} testID="ordering-first-skip" />
    </Sheet>
  );
}

/** True while the first-ask should show: a new patient who has not skipped it. */
export function useFirstAsk(ctx: Ctx): [boolean, () => void] {
  const [skipped, setSkipped] = useState<boolean | null>(null);
  useEffect(() => {
    let live = true;
    void readContextSkipped().then((v) => live && setSkipped(v));
    return () => { live = false; };
  }, []);
  return [skipped === false && ctx.status === 'ready' && isNewPatient(ctx.profile), () => setSkipped(true)];
}
