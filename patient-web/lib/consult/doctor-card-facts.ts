import { formatNumber } from "@/lib/format-price";
import type { DoctorRow } from "@/lib/api/doctors";

export type CardFactLabels = { years: (n: string) => string; male: string; female: string; insurance: string; wait: (n: string) => string };

/** The facts line of a doctor card: only what the server sent (years, gender, insurance, average wait); nothing is guessed. */
export function cardFacts(doctor: Pick<DoctorRow, "experienceYears" | "gender" | "acceptsInsurance" | "waitMinutes">, locale: string, labels: CardFactLabels): string[] {
  const out: string[] = [];
  if (doctor.experienceYears !== undefined && doctor.experienceYears > 0) out.push(labels.years(formatNumber(locale, doctor.experienceYears)));
  if (doctor.gender) out.push(doctor.gender === "male" ? labels.male : labels.female);
  if (doctor.acceptsInsurance) out.push(labels.insurance);
  if (doctor.waitMinutes !== undefined && doctor.waitMinutes > 0) out.push(labels.wait(formatNumber(locale, doctor.waitMinutes)));
  return out;
}
