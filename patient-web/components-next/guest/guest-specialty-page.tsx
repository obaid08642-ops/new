import type { ReactNode } from "react";
import { extractDoctors } from "@/lib/api/doctors";
import { readPublicDoctorsOf } from "@/lib/api/public-services-server";
import { signInHref } from "@/lib/services/guest";
import type { SpecialtySlug } from "@/lib/specialties";
import type { Locale } from "@/lib/i18n";
import type { FillIconName, ServiceTone } from "@/components-next/ui-generated/icons/fill";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { CareHero } from "@/components-next/care/care-kit";
import { GuestAction, GuestDoctors } from "./guest-service";
import { guestDoctorLabels } from "./guest-labels";

/** How many doctors the guest page lists; the full list is one tap away ("see all"). */
const GUEST_DOCTORS = 6;

/**
 * Issue 1550: a care service page (maternity, mental health, nutrition) as a guest sees it: what the service is, the published
 * doctors of its specialty with their consultation price (the public GET /care/doctors), the one action that needs an account
 * (it opens the sign-in and comes back to `next`), and the page's own public rows (`children`). Nothing personal is read.
 */
export async function GuestSpecialtyPage({ locale, title, tone, icon, heroTitle, heroBody, specialty, doctorsTitle, action, children }: {
  locale: Locale;
  title: string;
  tone: ServiceTone;
  icon: FillIconName;
  heroTitle: string;
  heroBody: string;
  specialty: SpecialtySlug;
  doctorsTitle: string;
  action: { id: string; title: string; body: string; label: string; next: string };
  children?: ReactNode;
}) {
  const [read, labels] = await Promise.all([readPublicDoctorsOf(specialty), guestDoctorLabels(specialty, doctorsTitle)]);
  const doctors = read.failed ? [] : extractDoctors(read.body).slice(0, GUEST_DOCTORS);
  return (
    <ConsultPage locale={locale} title={title} backHref={`/${locale}`}>
      <CareHero tone={tone} icon={icon} label={title} title={heroTitle} lines={[heroBody]} />
      <GuestAction id={action.id} title={action.title} body={action.body} label={action.label} href={signInHref(locale, action.next)} />
      <GuestDoctors locale={locale} id={`${action.id}-doctors`} specialty={specialty} failed={read.failed} doctors={doctors} labels={labels} />
      {children}
    </ConsultPage>
  );
}
