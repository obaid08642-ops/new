import { getTranslations } from "next-intl/server";
import { specialtyLabel, type SpecialtySlug } from "@/lib/specialties";
import type { GuestDoctorLabels } from "./guest-service";

/** The labels of the guest doctor list (issue 1550), from the doctor list's own messages so the cards read the same. */
export async function guestDoctorLabels(specialty: SpecialtySlug, title: string): Promise<GuestDoctorLabels> {
  const [g, d, c, names, rs] = await Promise.all([
    getTranslations("GuestServices"),
    getTranslations("Doctors"),
    getTranslations("ConsultWeb"),
    getTranslations("SpecialtyNames"),
    getTranslations("RouteState"),
  ]);
  return {
    title,
    seeAll: g("seeAll"),
    book: c("book"),
    verified: d("verifiedDoctor"),
    nameUnavailable: d("nameUnavailable"),
    clinic: d("service_clinic"),
    home: d("service_home"),
    video: d("service_video"),
    specialty: specialtyLabel(names, specialty) ?? undefined,
    error: { title: g("listUnavailableTitle"), body: g("listUnavailable"), retry: rs("retry") },
    empty: { title: g("doctorsEmpty"), body: g("doctorsEmptyBody") },
  };
}

/** The error and empty texts of the other guest lists. */
export async function guestListLabels(emptyTitle: string): Promise<{ error: { title: string; body: string; retry: string }; empty: { title: string } }> {
  const [g, rs] = await Promise.all([getTranslations("GuestServices"), getTranslations("RouteState")]);
  return { error: { title: g("listUnavailableTitle"), body: g("listUnavailable"), retry: rs("retry") }, empty: { title: emptyTitle } };
}
