import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { isLocale } from "@/lib/i18n";
import { RouteState } from "@/components-next/core/route-state";

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
  } else {
    // Next renders not-found without params (a page that calls notFound() under /en/...): the request's locale comes from
    // next-intl, so an English page no longer shows the Arabic "page unavailable" state (issue 1550 walkthrough).
    try {
      const requested = await getLocale();
      if (isLocale(requested)) locale = requested;
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
            ? "لا يمكن فتح هذه الصفحة أو أنك لا تملك صلاحية الوصول إليها."
            : "This page can't be opened, or you don't have access to it.",
        returnHome: locale === "ar" ? "العودة إلى البداية" : "Return home",
      };
      return fallback[key] || key;
    };
  });

  return <RouteState kind="not-found" locale={locale} title={t("title")} body={t("body")} primaryLabel={t("returnHome")} returnHomeLabel={t("returnHome")} />;
}
