import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { MapPin, ShieldCheck } from "lucide-react";
import { extractHomeCareProviders } from "@/lib/api/home-care-providers";
import { getPatientHomeCareProviders } from "@/lib/api/home-care-providers-server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { VectorNursing } from "@/components-next/vector-illustrations";
import styles from "./providers.module.css";

type Props = { params: Promise<{ locale: string }> };

export default async function HomeCareProvidersPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("HomeCareProviders");
  const token = await requirePatientAccess(locale);
  const response = await getPatientHomeCareProviders(token);
  if (response.status === 401) redirect(`/${locale}/login`);
  if (response.status === 403 || response.status === 404) notFound();

  if (!response.ok) {
    return (
      <main className={`main ${styles.page}`} style={{ background: "#FDFDFC", gap: 16 } as any}>
        <section
          className={styles.state}
          role="alert"
          style={{ border: "1px solid #E8EDEE", borderRadius: 20, background: "rgba(255,255,255,.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", padding: 24, gap: 16, display: "grid", placeItems: "center" } as any}
        >
          <span style={{ display: "grid", placeItems: "center", width: 48, height: 48, borderRadius: 16, background: "rgba(95,217,179,.12)", border: "1px solid #E8EDEE" } as any}>
            <VectorNursing size={48} aria-hidden="true" />
          </span>
          <h1 style={{ color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2 as any, WebkitBoxOrient: "vertical" as any, overflow: "hidden" } as any}>
            {t("unavailable")}
          </h1>
          <p style={{ color: "#6B7C6E", overflowWrap: "anywhere" } as any}>{t("unavailableBody")}</p>
        </section>
      </main>
    );
  }

  const providers = extractHomeCareProviders(await response.json().catch(() => null));

  return (
    <main className={`main ${styles.page}`} dir={locale === "ar" || locale === "ur" ? "rtl" : "ltr"} style={{ background: "#FDFDFC", gap: 16 } as any}>
      <header
        className={styles.hero}
        style={{
          gap: 16,
          padding: 24,
          border: "1px solid #E8EDEE",
          borderRadius: 20,
          background: "rgba(255,255,255,.82)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        } as any}
      >
        <div style={{ display: "grid", gap: 8, minWidth: 0 }}>
          <p className={styles.eyebrow} style={{ color: "#1E332E", display: "flex", alignItems: "center", gap: 8, overflowWrap: "anywhere" } as any}>
            <ShieldCheck size={15} aria-hidden="true" />
            <span style={{ overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2 as any, WebkitBoxOrient: "vertical" as any, overflow: "hidden" } as any}>
              {t("eyebrow")}
            </span>
          </p>
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
            {t("title")}
          </h1>
          <p style={{ color: "#6B7C6E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2 as any, WebkitBoxOrient: "vertical" as any, overflow: "hidden" } as any}>
            {t("subtitle")}
          </p>
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
          <VectorNursing size={48} aria-hidden="true" />
        </span>
      </header>

      {providers.length === 0 ? (
        <section
          className={styles.state}
          style={{ border: "1px solid #E8EDEE", borderRadius: 20, background: "rgba(255,255,255,.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", padding: 24, gap: 16, display: "grid", placeItems: "center" } as any}
        >
          <span style={{ display: "grid", placeItems: "center", width: 48, height: 48, borderRadius: 16, background: "rgba(95,217,179,.12)", border: "1px solid #E8EDEE" } as any}>
            <VectorNursing size={48} aria-hidden="true" />
          </span>
          <h2 style={{ color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2 as any, WebkitBoxOrient: "vertical" as any, overflow: "hidden" } as any}>{t("empty")}</h2>
        </section>
      ) : (
        <section className={styles.grid} aria-label={t("title")} style={{ gap: 16 } as any}>
          {providers.map((provider) => (
            <article
              className={styles.card}
              key={provider.id}
              style={{
                border: "1px solid #E8EDEE",
                borderRadius: 20,
                background: "rgba(255,255,255,.82)",
                backdropFilter: "blur(16px)",
                WebkitBackdropFilter: "blur(16px)",
                padding: 16,
                gap: 16,
              } as any}
            >
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
                <VectorNursing size={48} aria-hidden="true" />
              </span>
              <div style={{ display: "grid", gap: 8, minWidth: 0 }}>
                <h2
                  style={{
                    color: "#1E332E",
                    overflowWrap: "anywhere",
                    display: "-webkit-box",
                    WebkitLineClamp: 2 as any,
                    WebkitBoxOrient: "vertical" as any,
                    overflow: "hidden",
                  } as any}
                >
                  {locale === "ar" ? provider.nameAr || provider.nameEn : provider.nameEn || provider.nameAr}
                </h2>
                {provider.city ? (
                  <p className={styles.location} style={{ color: "#6B7C6E", overflowWrap: "anywhere", display: "flex", alignItems: "center", gap: 8 } as any}>
                    <MapPin size={14} aria-hidden="true" />
                    <span style={{ overflowWrap: "anywhere" } as any}>{provider.city}</span>
                  </p>
                ) : null}
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "6px 12px",
                    borderRadius: 20,
                    border: "1px solid #E8EDEE",
                    background: "#5FD9B3",
                    color: "#1E332E",
                    fontWeight: 700,
                    width: "fit-content",
                    overflowWrap: "anywhere",
                  } as any}
                >
                  {t("verified")}
                </span>
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
