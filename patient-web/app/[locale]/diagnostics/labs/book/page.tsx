import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { isLocale } from "@/lib/i18n";
import { requirePatientAccess } from "@/lib/auth/session";
import { getPublicLabService } from "@/lib/api/labs-server";
import { extractLabService } from "@/lib/api/labs";
import { getCompatibleLabProviders } from "@/lib/api/diagnostics-server";
import { LabBookingForm } from "@/components-next/lab-booking-form";
import { VectorLabs } from "@/components-next/vector-illustrations";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ serviceId?: string }> };
export default async function LabBookingPage({ params, searchParams }: Props) {
  const { locale } = await params; if (!isLocale(locale)) notFound(); setRequestLocale(locale);
  const { serviceId } = await searchParams; if (!serviceId) notFound();
  const token = await requirePatientAccess(locale); if (!token) redirect(`/${locale}/login`);
  const response = await getPublicLabService(serviceId); if (!response || !response.ok) notFound();
  const service = extractLabService(await response.json().catch(() => null)); if (!service) notFound();
  const providers = await getCompatibleLabProviders(serviceId);
  const provider = providers[0]; const AR = locale === "ar" || locale === "ur";
  const t = await getTranslations("Diagnostics");
  return <main className="main" style={{ background: "#FDFDFC", gap: 16, padding: "16px 0" } as any}><Link href={`/${locale}/diagnostics/labs`} style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "#1E332E", borderRadius: 20, border: "1px solid #E8EDEE", padding: "8px 12px", background: "rgba(255,255,255,.82)", overflowWrap: "anywhere" } as any}><ChevronLeft size={16} aria-hidden="true" />{t("back")}</Link>
    <section className="hero premium-hero" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, padding: 24, borderRadius: 20, border: "1px solid #E8EDEE", background: "rgba(255,255,255,.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" } as any}><div className="premium-hero-copy" style={{ display: "grid", gap: 8, minWidth: 0, flex: 1 } as any}><div className="eyebrow" style={{ color: "#1E332E", gap: 8, overflowWrap: "anywhere" } as any}>{AR ? "حجز تحليل" : "Lab booking"}</div><h1 style={{ color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{AR ? service.nameAr ?? service.nameEn : service.nameEn ?? service.nameAr}</h1><p style={{ overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{AR ? "اختر الموعد والموقع وطريقة الدفع؛ التأكيد يُحفظ من الخادم." : "Choose time, location, and payment; confirmation is persisted server-side."}</p></div><span style={{ display: "grid", placeItems: "center", width: 48, height: 48, borderRadius: 16, background: "rgba(95,217,179,.12)", border: "1px solid #E8EDEE", flex: "0 0 auto" } as any}><VectorLabs size={48} aria-hidden="true" /></span></section>
    {provider ? <section style={{ display: "grid", gap: 16, padding: 24, borderRadius: 20, border: "1px solid #E8EDEE", background: "rgba(255,255,255,.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" } as any}><LabBookingForm locale={locale} serviceId={service.id} providerId={provider.id ?? provider.account_id} serviceName={AR ? service.nameAr ?? service.nameEn ?? "التحليل" : service.nameEn ?? service.nameAr ?? "Lab test"} homeEligible={Boolean(service.homeVisitSupported)} /></section> : <section className="state" role="alert" style={{ display: "grid", gap: 16, padding: 24, borderRadius: 20, border: "1px dashed #E8EDEE", background: "rgba(255,255,255,.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" } as any}><span style={{ display: "grid", placeItems: "center", width: 48, height: 48, borderRadius: 16, background: "rgba(95,217,179,.12)", border: "1px solid #E8EDEE" } as any}><VectorLabs size={48} aria-hidden="true" /></span><h2 style={{ color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{AR ? "لا يوجد مزود متاح حالياً" : "No provider is available"}</h2><p style={{ overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{AR ? "لم يتم إنشاء حجز. حاول لاحقاً أو اختر تحليلاً آخر." : "No booking was created. Try later or choose another test."}</p></section>}
  </main>;
}
