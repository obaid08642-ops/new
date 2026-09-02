import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { isLocale } from "@/lib/i18n";

type Props = { params?: Promise<{ locale?: string }> };

export default async function LocaleNotFound(props: Props) {
  let locale = "ar";
  if (props?.params) {
    try {
      const p = await props.params;
      if (p?.locale && isLocale(p.locale)) locale = p.locale;
    } catch {
      // ignore
    }
  }

  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "NotFound" }).catch(async () => {
    return (key: string) => {
      const fallback: Record<string, string> = {
        title: locale === "ar" ? "الصفحة غير متاحة" : "Page unavailable",
        body:
          locale === "ar"
            ? "لا يمكن فتح هذا المسار أو أنك لا تملك صلاحية الوصول إليه."
            : "This route cannot be opened or you do not have permission to access it.",
        returnHome: locale === "ar" ? "العودة إلى البداية" : "Return home",
      };
      return fallback[key] || key;
    };
  });

  return (
    <main className="main auth-wrap">
      <section className="auth-card" role="status">
        <div className="eyebrow">404</div>
        <h1>{t("title")}</h1>
        <p>{t("body")}</p>
        <Link className="button button-primary" href={`/${locale}`}>
          {t("returnHome")}
        </Link>
      </section>
    </main>
  );
}
