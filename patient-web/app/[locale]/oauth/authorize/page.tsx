import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthLayout } from "@/components-next/auth/auth-layout";
import { Button } from "@/components-next/ui-generated/components/Button";
import { requirePatientAccess } from "@/lib/auth/session";
import { getAgentConsent, pickAuthorizeParams, type AgentConsent } from "@/lib/api/agent-oauth-server";
import { isLocale } from "@/lib/i18n";
import styles from "@/components-next/auth/auth.module.css";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: "AgentConsent" });
  return { title: t("metaTitle"), robots: { index: false, follow: false } };
}

const SCOPE_KEYS: Record<string, "scopeRead" | "scopeOrder" | "scopeBook"> = {
  "agent:read": "scopeRead",
  "agent:order": "scopeOrder",
  "agent:book": "scopeBook",
};

/**
 * AC-1 consent: an AI assistant asks to act for the signed-in patient. The backend checks the
 * request (client, redirect, PKCE S256, scopes) and stores the decision; this page only shows it.
 * Functional layout from the auth family; the board-level design is a needs-review item.
 */
export default async function AgentConsentPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "AgentConsent" });
  const token = await requirePatientAccess(locale);
  const request = pickAuthorizeParams(await searchParams);

  const upstream = await getAgentConsent(token, request);
  const consent: AgentConsent | null = upstream.ok ? await upstream.json().catch(() => null) : null;

  if (!consent) {
    return (
      <AuthLayout locale={locale}>
        <div className={styles.body}>
          <h1 className={styles.title}>{t("errorTitle")}</h1>
          <p>{t("errorBody")}</p>
        </div>
      </AuthLayout>
    );
  }

  const hidden = Object.entries(request).map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />);
  return (
    <AuthLayout locale={locale}>
      <div className={styles.body}>
        <h1 className={styles.title}>{t("title", { client: consent.client.client_name })}</h1>
        <p>{t("intro", { client: consent.client.client_name })}</p>
        <h2>{t("scopesTitle")}</h2>
        <ul>
          {consent.scopes.filter((s) => SCOPE_KEYS[s]).map((s) => <li key={s}>{t(SCOPE_KEYS[s])}</li>)}
        </ul>
        <p>{t("confirmNote")}</p>
        <p>{t("revokeNote")}</p>
        <form method="post" action="/api/oauth/authorize" className={styles.form}>
          {hidden}
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="decision" value="approve" />
          <Button type="submit" label={t("approve")} fullWidth />
        </form>
        <form method="post" action="/api/oauth/authorize">
          {hidden}
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="decision" value="deny" />
          <Button type="submit" variant="secondary" label={t("deny")} fullWidth />
        </form>
      </div>
    </AuthLayout>
  );
}
