import Link from "next/link";

type Props = { params?: Promise<{ locale?: string }> };

export default async function LocaleNotFound(props: Props) {
  let locale = "ar";
  if (props?.params) {
    try {
      const p = await props.params;
      if (p?.locale) locale = p.locale;
    } catch {
      // ignore
    }
  }

  const isAr = locale === "ar";

  return (
    <main className="main auth-wrap">
      <section className="auth-card" role="status">
        <div className="eyebrow">404</div>
        <h1>{isAr ? "الصفحة غير موجودة" : "Page Not Found"}</h1>
        <p>
          {isAr
            ? "عذراً، لم نتمكن من العثور على الصفحة أو العنصر المطلوب."
            : "Sorry, we could not find the requested page or item."}
        </p>
        <Link className="button button-primary" href={`/${locale}`}>
          {isAr ? "العودة للرئيسية" : "Return Home"}
        </Link>
      </section>
    </main>
  );
}
