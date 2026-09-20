import { notFound, redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { VectorMap } from "@/components-next/vector-illustrations";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { getPatientAddresses } from "@/lib/api/addresses-server";
import { DeliveryAddressSelectClient } from "@/components-next/delivery-address-select-client";
import type { PatientAddress } from "@/components-next/addresses";
import styles from "./address-select.module.css";

type Props = { params: Promise<{ locale: string }> };

/** Parity with app delivery/address-select: saved addresses + default preselect + map fallback. */
export default async function DeliveryAddressSelectPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const ar = locale === "ar";
  const token = await requirePatientAccess(locale);
  const response = await getPatientAddresses(token);
  if (response.status === 401) redirect(`/${locale}/login`);
  const payload = response.ok ? await response.json().catch(() => null) : null;
  const root = (payload && typeof payload === "object" ? payload : {}) as Record<string, unknown>;
  const raw = [root.addresses, root.data].find(Array.isArray);
  const addresses: PatientAddress[] = (Array.isArray(raw) ? raw : []).flatMap((a) => {
    if (!a || typeof a !== "object" || typeof (a as Record<string, unknown>).id !== "string") return [];
    return [a as PatientAddress];
  });
  return (
    <main className={`main ${styles.page}`} style={{ background: "#FDFDFC", gap: 16 } as any}>
      <section className={styles.header} style={{ gap: 16, padding: 24, borderRadius: 20, border: "1px solid #E8EDEE", background: "rgba(255,255,255,.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" } as any}>
        <div style={{ display: "grid", gap: 8, minWidth: 0, flex: 1 } as any}>
          <p className={styles.eyebrow} style={{ color: "#1E332E", gap: 8, overflowWrap: "anywhere" } as any}>{ar ? "التوصيل" : "Delivery"}</p>
          <h1 style={{ color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{ar ? "عنوان التوصيل" : "Delivery address"}</h1>
        </div>
        <span style={{ display: "grid", placeItems: "center", width: 48, height: 48, borderRadius: 16, background: "rgba(95,217,179,.12)", border: "1px solid #E8EDEE", flex: "0 0 auto" } as any}><VectorMap size={48} aria-hidden="true" /></span>
      </section>
      <DeliveryAddressSelectClient addresses={addresses} locale={locale} />
    </main>
  );
}
