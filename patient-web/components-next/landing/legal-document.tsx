import { getTranslations } from "next-intl/server";
import { LandingPage } from "@/components-next/landing/landing-kit";
import rx from "@/components-next/pharmacy/rx.module.css";
import { parseLegal } from "@/lib/legal/parse-legal";
import type { LegalPolicy } from "@/lib/api/legal-policy";
import type { Locale } from "@/lib/i18n";
import styles from "./landing.module.css";

/**
 * A legal page (terms, privacy, the cancellation and refund policy, the telehealth consent): the shell, the title and the policy text the legal service answers, in a card (canvas/Settings:
 * a white card of rows). The service holds Arabic and English; on a page in another language the text keeps its own language
 * and direction, so the reader and the screen reader are told which it is. The version and the date it applies from close the page.
 */
export type LegalKind = "terms" | "privacy" | "refund" | "telehealth";

const TITLE_KEYS: Record<LegalKind, string> = { terms: "legal.terms", privacy: "legal.privacy", refund: "legal.refund", telehealth: "legal.telehealth" };

export async function LegalDocument({ locale, kind, policy }: { locale: Locale; kind: LegalKind; policy: LegalPolicy & { lang?: "ar" | "en"; current?: boolean } }) {
  const t = await getTranslations("PublicLanding");
  const groups: Array<{ kind: "heading" | "paragraph"; text: string } | { kind: "bullets"; items: string[] }> = [];
  for (const block of parseLegal(policy.content ?? "")) {
    const last = groups[groups.length - 1];
    if (block.kind !== "bullet") groups.push({ kind: block.kind, text: block.text });
    else if (last && last.kind === "bullets") last.items.push(block.text);
    else groups.push({ kind: "bullets", items: [block.text] });
  }
  // the text keeps its own language: the service's (ar for ar, else en), or the embedded copy's when the service was down
  const textLocale = policy.lang ?? (locale === "ar" ? "ar" : "en");
  const effective = policy.effective_date ? new Date(policy.effective_date) : null;
  const date = effective && !Number.isNaN(effective.getTime()) ? new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" }).format(effective) : "";
  const version = policy.version !== undefined && policy.version !== null && policy.version !== "" ? String(policy.version) : "";
  return (
    // terms and privacy are read from the sign-up; the refund policy and the telehealth consent from anywhere on the site
    <LandingPage locale={locale} title={t(TITLE_KEYS[kind])} backHref={kind === "terms" || kind === "privacy" ? `/${locale}/register` : `/${locale}`}>
      <article className={`${rx.card} ${styles.legal}`} lang={textLocale} dir={textLocale === "ar" ? "rtl" : "ltr"}>
        {groups.map((group, index) =>
          group.kind === "heading" ? (
            <h2 key={index} className={rx.h2}>{group.text}</h2>
          ) : group.kind === "bullets" ? (
            <ul key={index} className={styles.legalBullets}>
              {group.items.map((item, i) => <li key={i}>{item}</li>)}
            </ul>
          ) : (
            <p key={index} className={styles.legalText}>{group.text}</p>
          ),
        )}
      </article>
      {version ? <p className={rx.note}>{date ? t("legal.version", { version, date }) : t("legal.versionOnly", { version })}</p> : null}
      {policy.current ? <p className={rx.note}>{t("legal.currentVersion")}</p> : null}
    </LandingPage>
  );
}
