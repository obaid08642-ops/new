import React from 'react';
import { Text, View } from 'react-native';

import { DoctorCard } from '../../../../packages/ui-native/src';
import { step as scale, useScreenUi } from '../screen/ScreenKit';
import { specialtyLook, visitMode, StatusTag, type VisitMode } from './ConsultKit';
import { apiMediaUri } from '../../utils/mediaUri';
import type { DoctorCardRow } from '../../utils/doctorSearch';

/**
 * The doctor list card (board DoctorCard + the owner-approved richer card of 2026-10-24): the shared board card with the
 * name, grade, specialty, place, visit modes, rating, next slot, the lowest price, the available-now dot and the
 * verified seal, and under it a strip of the facts the board card has no slot for: years of experience, gender, the
 * average wait, insurance and the price of every mode. Each fact is drawn only when the server sent it.
 */
export function DoctorListCard({ doctor, onPress, onBook, testID }: { doctor: DoctorCardRow; onPress: () => void; onBook: () => void; testID?: string }) {
  const { theme, c, t, k, num, money } = useScreenUi();
  const modes: VisitMode[] = [doctor.clinic && 'clinic', doctor.home && 'home', doctor.online && 'online'].filter((m): m is VisitMode => Boolean(m));
  const priceOf = (m: VisitMode): number | null => (m === 'clinic' ? doctor.prices.clinic : m === 'online' ? doctor.prices.online : doctor.prices.home);
  const facts: string[] = [
    ...(doctor.exp != null && doctor.exp > 0 ? [k('consult.card.years', { n: num(doctor.exp) })] : []),
    ...(doctor.gender ? [k(`consult.gender.${doctor.gender}`)] : []),
    ...(doctor.wait != null ? [k('consult.card.wait', { n: num(doctor.wait) })] : []),
  ];
  const priced = modes.flatMap((m) => {
    const p = priceOf(m);
    return p !== null ? [`${k(`consult.mode.${m}`)} ${money(p)} ${k('consult.currency')}`] : [];
  });
  const hasStrip = facts.length > 0 || priced.length > 0 || doctor.ins;
  return (
    <View style={{ gap: 6 }}>
      <DoctorCard
        name={doctor.name}
        photoSrc={apiMediaUri(doctor.photo)}
        tone={specialtyLook(doctor.spec ?? undefined).tone}
        verifiedLabel={doctor.verified ? k('consult.doc.verified') : undefined}
        availableLabel={doctor.availableNow ? k('consult.doc.availableNow') : undefined}
        grade={doctor.deg ?? doctor.title ?? undefined}
        specialty={doctor.spec ?? undefined}
        place={doctor.hospital ?? undefined}
        modes={modes.flatMap((m) => (visitMode(m) ? [{ mode: m, label: k(`consult.mode.${m}`) }] : []))}
        rating={doctor.rating != null && doctor.rating > 0 ? { value: doctor.rating, count: doctor.reviews ?? 0 } : undefined}
        nextSlot={doctor.slot ?? undefined}
        price={doctor.price != null ? money(doctor.price) : undefined}
        currency={doctor.price != null ? k('consult.currency') : undefined}
        bookLabel={k('consult.hub.book')}
        onPress={onPress}
        onBook={onBook}
        theme={theme}
        testID={testID}
      />
      {hasStrip ? (
        <View testID={testID ? `${testID}-facts` : undefined} style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, paddingHorizontal: 8 }}>
          {facts.map((f) => (
            <Text key={f} style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary }}>{f}</Text>
          ))}
          {priced.map((p) => (
            <Text key={p} style={{ ...scale(t, 'meta', 'bold'), color: c.text.primary }}>{p}</Text>
          ))}
          {doctor.ins ? <StatusTag label={k('consult.card.insurance')} tone="success" /> : null}
        </View>
      ) : null}
    </View>
  );
}
