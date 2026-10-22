import type { ReactNode } from "react";
import type { ConsultMode } from "@/components-next/ui-generated/components/contract";
import { ButtonLink } from "@/components-next/pharmacy/button-link";
import { ConsultState } from "@/components-next/consult/consult-state";
import { DoctorListCard } from "@/components-next/consult/doctor-list-card";
import { SectionHead } from "@/components-next/health/health-kit";
import { doctorDisplayName, type DoctorRow } from "@/lib/api/doctors";
import rx from "@/components-next/pharmacy/rx.module.css";
import consult from "@/components-next/consult/consult.module.css";

/**
 * Issue 1550: the part of a service page a guest gets instead of the sign-in form. The service's public lists come first; the
 * one action that needs an account (book, save, track) is this card, and its button opens the sign-in page with the way back.
 */
export function GuestAction({ id, title, body, label, href }: { id: string; title: string; body: string; label: string; href: string }) {
  return (
    <section className={rx.card} aria-labelledby={id} data-guest-action="">
      <h2 id={id} className={rx.h2}>{title}</h2>
      <p className={rx.note}>{body}</p>
      <ButtonLink href={href} label={label} fullWidth />
    </section>
  );
}

/** A public list with its three outcomes: the backend did not answer (error and retry), nothing published yet, or the rows. */
export function GuestList({ failed, count, error, empty, children }: {
  failed: boolean;
  count: number;
  error: { title: string; body: string; retry: string };
  empty: { title: string; body?: string };
  children: ReactNode;
}) {
  if (failed) return <ConsultState kind="error" title={error.title} body={error.body} retryLabel={error.retry} />;
  if (count === 0) return <ConsultState kind="empty" title={empty.title} body={empty.body} />;
  return <>{children}</>;
}

export type GuestDoctorLabels = {
  title: string;
  seeAll: string;
  book: string;
  verified: string;
  nameUnavailable: string;
  clinic: string;
  home: string;
  video: string;
  specialty?: string;
  error: { title: string; body: string; retry: string };
  empty: { title: string; body?: string };
};

/** The published doctors of the service's specialty with their consultation price; each card opens the public doctor page. */
export function GuestDoctors({ locale, id, specialty, failed, doctors, labels }: { locale: string; id: string; specialty: string; failed: boolean; doctors: DoctorRow[]; labels: GuestDoctorLabels }) {
  return (
    <>
      <SectionHead id={id} title={labels.title} action={{ href: `/${locale}/consultations/doctors?specialty=${encodeURIComponent(specialty)}`, label: labels.seeAll }} />
      <GuestList failed={failed} count={doctors.length} error={labels.error} empty={labels.empty}>
        <ul className={`${consult.list} ${consult.grid}`} aria-labelledby={id}>
          {doctors.map((doctor) => {
            const modes: Array<{ mode: ConsultMode; label: string }> = [];
            if (doctor.clinic) modes.push({ mode: "clinic", label: labels.clinic });
            if (doctor.home) modes.push({ mode: "home", label: labels.home });
            if (doctor.online) modes.push({ mode: "online", label: labels.video });
            return (
              <li key={doctor.id}>
                <DoctorListCard
                  locale={locale}
                  href={`/${locale}/consultations/doctors/${encodeURIComponent(doctor.id)}`}
                  name={doctorDisplayName(doctor, locale) ?? labels.nameUnavailable}
                  grade={doctor.degree}
                  specialty={labels.specialty}
                  place={doctor.facility}
                  modes={modes}
                  rating={doctor.rating !== undefined && doctor.reviews ? { value: doctor.rating, count: doctor.reviews } : undefined}
                  nextSlotIso={doctor.nextSlot}
                  price={doctor.price}
                  bookLabel={labels.book}
                  verifiedLabel={doctor.verified ? labels.verified : undefined}
                  photoSrc={doctor.photo}
                />
              </li>
            );
          })}
        </ul>
      </GuestList>
    </>
  );
}
