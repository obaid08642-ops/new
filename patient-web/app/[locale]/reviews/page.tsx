import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { callPatientApi } from "@/lib/api/upstream";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { ConsultState } from "@/components-next/consult/consult-state";
import { PostCallRatingForm } from "@/components-next/post-call-rating-form";
import { Hero } from "@/components-next/consult/consult-parts";
import { Stars } from "@/components-next/account/stars";
import rx from "@/components-next/pharmacy/rx.module.css";
import forms from "@/components-next/consult/consult.module.css";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ target?: string; booking_kind?: string; booking_id?: string }> };

type Review = { id: string; rating: number; comment?: string };

function readReviews(payload: unknown): Review[] {
  const root = payload && typeof payload === "object" && !Array.isArray(payload) ? (payload as { data?: unknown }) : null;
  const list = Array.isArray(root?.data) ? root.data : [];
  return list.flatMap((item: unknown, index: number) => {
    const r = item && typeof item === "object" ? (item as Record<string, unknown>) : null;
    if (!r) return [];
    return [{
      id: String(r.id ?? index),
      rating: Math.min(Math.max(Number(r.rating) || 0, 0), 5),
      comment: typeof r.comment === "string" && r.comment ? r.comment : undefined,
    }];
  });
}

/** `/reviews`: the reviews the server returns (GET /patient-ux/reviews, optionally for one `?target=`), on the shared card. */
export default async function ReviewsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const { target = "", booking_kind: kindParam = "", booking_id: idParam = "" } = await searchParams;
  const idPattern = /^[A-Za-z0-9_-]{1,128}$/;
  const rateKind = idPattern.test(kindParam) ? kindParam : "";
  const rateId = idPattern.test(idParam) ? idParam : "";
  const t = await getTranslations("Reviews");
  const a = await getTranslations("AccountWeb");
  const rs = await getTranslations("RouteState");
  const pc = await getTranslations("PostCallRating");
  const c = await getTranslations("ConsultWeb");
  const token = await requirePatientAccess(locale);
  const q = target && /^[A-Za-z0-9_-]{1,128}$/.test(target) ? `?target_id=${encodeURIComponent(target)}` : "";
  const res = await callPatientApi(`/patient-ux/reviews${q}`, {}, token);
  if (res.status === 401) redirect(`/${locale}/login`);
  const back = `/${locale}/dashboard`;
  if (!res.ok) {
    return (
      <ConsultPage locale={locale} title={t("title")} backHref={back}>
        <ConsultState kind="error" title={a("reviewsErrorTitle")} body={a("reviewsErrorBody")} retryLabel={rs("retry")} />
      </ConsultPage>
    );
  }
  const list = readReviews(await res.json().catch(() => null));

  return (
    <ConsultPage locale={locale} title={t("title")} backHref={back}>
      {rateKind && rateId ? (
        <>
          <Hero icon="star" tone="amber" title={pc("rateTitle")} sub={pc("subtitle")} />
          <PostCallRatingForm
            locale={locale}
            appointmentId={rateId}
            bookingKind={rateKind}
            labels={{ rating: c("ratingGroup"), star: c("ratingStar"), comment: pc("comment"), commentPh: pc("commentPh"), submit: pc("submit"), submitting: pc("submitting"), thanks: pc("thanks"), error: pc("error"), tagsTitle: pc("tagsTitle"), tags: { excellent: pc("tags.excellent"), fast: pc("tags.fast"), professional: pc("tags.professional"), clean: pc("tags.clean"), helpful: pc("tags.helpful"), recommend: pc("tags.recommend") } }}
          />
        </>
      ) : null}
      {list.length === 0 ? (
        <ConsultState kind="empty" icon="star" tone="amber" title={t("empty")} />
      ) : (
        <ul className={forms.list} aria-label={t("title")}>
          {list.map((review) => (
            <li key={review.id} className={rx.card}>
              <Stars score={review.rating} label={a("ratingOf", { score: review.rating })} />
              {review.comment ? <p className={forms.body}>{review.comment}</p> : null}
            </li>
          ))}
        </ul>
      )}
    </ConsultPage>
  );
}
