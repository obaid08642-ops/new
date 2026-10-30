import React from 'react';
import { View } from 'react-native';

import { offerLines, offerSummaryOf } from '../../utils/catalogueOffers';
import { rowField } from '../../utils/rowField';
import { useScreenUi } from '../screen/ScreenKit';
import { ServiceCard, serviceGlyph } from './NursingKit';

type Rec = Record<string, unknown>;
const text = (v: unknown): string => (typeof v === 'string' || typeof v === 'number' ? String(v) : '');
const priceOf = (v: unknown): number | null => (v !== undefined && v !== null && v !== '' && Number.isFinite(Number(v)) ? Number(v) : null);

/**
 * The nursing services of the catalogue (GET /home-care/services) as cards, each with what nurses offer for it ("3 providers · From 120.00 SAR",
 * at home / insurance). The nursing tab and the service home list draw this one component, so a service looks the same wherever it is listed,
 * and a service no nurse offers yet stays in the list (its page says so and offers "Notify me when available").
 */
export function NursingServiceList({ services, actionLabel, onOpen, onBook }: { services: Rec[]; actionLabel: string; onOpen: (id: string, title: string) => void; onBook: (id: string, title: string) => void }) {
  const { k, num, money, lang } = useScreenUi();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
      {services.map((svc, position) => {
        const id = text(svc.id);
        const titleField = rowField(svc, 'name');
        const title = titleField.text || text(svc.title);
        const descField = rowField(svc, 'description');
        const offer = offerSummaryOf(svc);
        const lines = offerLines(offer, { k, num, money, lang }, true);
        return (
          <ServiceCard
            key={id}
            testID={`nursing-service-${id}`}
            enterIndex={position}
            title={title}
            titleMark={titleField.text ? titleField.mark : undefined}
            desc={descField.text || undefined}
            descMark={descField.mark}
            image={text(svc.image_url ?? svc.image) || null}
            icon={serviceGlyph(svc.id).icon}
            // with the offer summary the price is the nurses' own "from" (in the offer line); the catalogue's base price is the fallback of an older answer
            price={offer && offer.fromPrice !== null ? null : priceOf(svc.price)}
            offerLine={lines ? [lines.providers, lines.from, ...lines.where].filter(Boolean).join(' · ') : undefined}
            onPress={() => onOpen(id, title)}
            actionLabel={actionLabel}
            onAction={() => onBook(id, title)}
          />
        );
      })}
    </View>
  );
}
