import Link from "next/link";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { VectorEmergency } from "@/components-next/vector-illustrations";
import { EmergencyTrackingClient } from "@/components-next/emergency-tracking-client";

type Props = { params: Promise<{ locale: string }> };

/** Parity with app emergency/tracking: server-only tracking data polled every 10s, tel:997 fallback. */
export default async function EmergencyTrackingPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const ar = locale === "ar";
  await requirePatientAccess(locale);
  return (
    <main className="main" style={{ background: "#FDFDFC", display: "grid", gap: 16 } as any}>
      <section
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          padding: 24,
          border: "1px solid #E8EDEE",
          borderRadius: 20,
          background: "rgba(255,255,255,.82)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
        } as any}
      >
        <div style={{ display: "grid", gap: 8, minWidth: 0 }}>
          <h1
            style={{
              color: "#1E332E",
              overflowWrap: "anywhere",
              display: "-webkit-box",
              WebkitLineClamp: 2 as any,
              WebkitBoxOrient: "vertical" as any,
              overflow: "hidden",
            } as any}
          >
            {ar ? "تتبع سيارة الإسعاف" : "Track ambulance"}
          </h1>
          <Link
            href={`/${locale}/emergency`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 20px",
              borderRadius: 20,
              border: "1px solid #E8EDEE",
              background: "#5FD9B3",
              color: "#1E332E",
              fontWeight: 700,
              textDecoration: "none",
              overflowWrap: "anywhere",
            } as any}
          >
            {ar ? "الطوارئ" : "Emergency"}
          </Link>
        </div>
        <span
          style={{
            display: "grid",
            placeItems: "center",
            width: 48,
            height: 48,
            borderRadius: 16,
            background: "rgba(95,217,179,.12)",
            border: "1px solid #E8EDEE",
            flex: "0 0 auto",
          } as any}
        >
          <VectorEmergency size={48} aria-hidden="true" />
        </span>
      </section>
      <section
        style={{
          display: "grid",
          gap: 16,
          padding: 16,
          border: "1px solid #E8EDEE",
          borderRadius: 20,
          background: "rgba(255,255,255,.82)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
        } as any}
      >
        <EmergencyTrackingClient locale={locale} />
      </section>
    </main>
  );
}
