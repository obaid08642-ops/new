import type { DoctorReview, PublicRating } from "@/lib/api/doctors";
import { formatNumber } from "@/lib/format-price";
import type { ReviewItem } from "@/components-next/consult/doctor-sections";

/** A review date as the reader's language writes it (UTC day, so the server and the browser agree). */
export function reviewDate(locale: string, iso: string | undefined): string | undefined {
  if (!iso) return undefined;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? undefined : new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" }).format(date);
}

export type ReviewLabels = { anonymous: string; subLabels: Record<string, string> };

/** Review rows for the page: sub-ratings only for the keys the page can name (a key it cannot name in six languages is not drawn). */
export function reviewItems(rows: Array<DoctorReview | (PublicRating & { rating?: undefined })>, locale: string, labels: ReviewLabels): ReviewItem[] {
  return rows.flatMap((row, index): ReviewItem[] => {
    const isPublic = "score" in row;
    const score = isPublic ? row.score : (row as DoctorReview).rating;
    if (score === undefined) return [];
    const text = isPublic ? row.comment : (row as DoctorReview).text;
    const date = isPublic ? row.date : (row as DoctorReview).date;
    const subRatings = isPublic ? undefined : (row as DoctorReview).subRatings;
    const subs = (subRatings ?? []).flatMap((s) => (labels.subLabels[s.key] ? [{ label: labels.subLabels[s.key], value: formatNumber(locale, s.value) }] : []));
    return [{ key: `${index}-${date ?? ""}`, score, text, who: row.reviewer ?? labels.anonymous, date: reviewDate(locale, date), subs: subs.length ? subs : undefined }];
  });
}
