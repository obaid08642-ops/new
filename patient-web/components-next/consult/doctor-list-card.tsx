"use client";

import { useEffect, useState } from "react";
import { DoctorCard } from "@/components-next/ui-generated/components/Cards";
import type { ConsultMode } from "@/components-next/ui-generated/components/contract";
import { formatPrice } from "@/lib/format-price";

export type DoctorListCardProps = {
  locale: string;
  href: string;
  name: string;
  grade?: string;
  specialty?: string;
  place?: string;
  modes: Array<{ mode: ConsultMode; label: string }>;
  /** Only with a real count of reviews: a rating without one is not drawn. */
  rating?: { value: number; count: number };
  /** The doctor's next free time as the server sent it; written for the reader (zone and language) after the page is on screen. */
  nextSlotIso?: string;
  price?: number;
  bookLabel: string;
  /** The verified seal's accessible name; given only for an admin-approved, licence-verified doctor. */
  verifiedLabel?: string;
};

/**
 * One doctor as canvas/Consult draws it (the shared DoctorCard): the whole card is the link to the doctor's page. The
 * next free time is written in the reader's own time zone once the page is on screen, as the order dates are.
 */
export function DoctorListCard({ locale, href, name, grade, specialty, place, modes, rating, nextSlotIso, price, bookLabel, verifiedLabel }: DoctorListCardProps) {
  const [nextSlot, setNextSlot] = useState<string | undefined>(undefined);
  useEffect(() => {
    if (!nextSlotIso) { setNextSlot(undefined); return; }
    const date = new Date(nextSlotIso);
    setNextSlot(Number.isNaN(date.getTime()) ? undefined : new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(date));
  }, [nextSlotIso, locale]);
  const money = price !== undefined ? formatPrice(locale, price) : undefined;
  return (
    <DoctorCard
      href={href}
      name={name}
      grade={grade}
      specialty={specialty}
      place={place}
      modes={modes}
      rating={rating}
      nextSlot={nextSlot}
      price={money?.amount}
      currency={money?.currency}
      bookLabel={bookLabel}
      verifiedLabel={verifiedLabel}
    />
  );
}
