import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getPublicLab, extractLab } from "@/lib/api/labs-server";
import { isLocale, locales } from "@/lib/i18n";
import { localizedUrl } from "@/lib/seo";
import { allowedImageUrl } from "@/lib/image-hosts";
import { CatalogImage } from "@/components-next/pharmacy/catalog-image";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { ConsultState } from "@/components-next/consult/consult-state";
import { ActionLinks, Hero, Notice, SectionCard, type LinkAction } from "@/components-next/consult/consult-parts";
import { LAB, LabCard, TagRow, money, pickText } from "@/components-next/diagnostics/diag-parts";
import styles from "@/components-next/diagnostics/diag.module.css";

type Props = { params: Promise<{ locale: string; labId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, labId } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: "LabsDetail" });
  const canonical = localizedUrl(locale, `/diagnostics/labs/${encodeURIComponent(labId)}`);
  return {
    title: t("title"),
    description: t("subtitle"),
    alternates: {
      canonical,
      languages: {
        ...Object.fromEntries(locales.map((l) => [l, localizedUrl(l, `/diagnostics/labs/${encodeURIComponent(labId)}`)])),
        "x-default": localizedUrl("ar", `/diagnostics/labs/${encodeURIComponent(labId)}`),
      },
    },
    openGraph: { type: "website", url: canonical },
    robots: { index: true, follow: true },
  };
}

/** A laboratory (canvas/ServiceHub, the lab card opened): the cover, the name, the city, the phone and the tests it offers, each going to its booking. */
export default async function LabDetailPage({ params }: Props) {
  const { locale, labId } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);

  const t = await getTranslations("LabsDetail");
  const w = await getTranslations("DiagWeb");
  const response = await getPublicLab(labId);
  if (!response || response.status === 404) notFound();
  const backHref = `/${locale}/diagnostics/labs`;

  if (!response.ok) {
    return (
      <ConsultPage locale={locale} title={t("title")} backHref={backHref}>
        <ConsultState kind="error" title={t("unavailableTitle")} body={t("unavailableBody")} retryLabel={t("retry")} actionLabel={t("back")} actionHref={backHref} />
      </ConsultPage>
    );
  }

  const lab = extractLab(await response.json().catch(() => null));
  if (!lab) notFound();
  const name = pickText(locale, lab.name_ar ?? lab.name, lab.name_en ?? lab.name) ?? lab.name;
  const image = allowedImageUrl(lab.image);
  const place = [lab.city, lab.address].filter(Boolean).join(" · ");
  const actions: LinkAction[] = lab.phone ? [{ href: `tel:${lab.phone}`, label: w("callLab"), variant: "outline", external: true }] : [];

  return (
    <ConsultPage locale={locale} title={name} backHref={backHref}>
      {image ? <div className={styles.coverBox}><CatalogImage src={image} alt={name} sizes="(max-width: 720px) 100vw, 720px" className={styles.photoImage} priority /></div> : null}
      <Hero icon={LAB.icon} tone={LAB.tone} title={name} sub={place || undefined}>
        <TagRow tags={lab.home_visit ? [{ label: t("homeVisitSupported"), tone: LAB.tone }] : []} />
      </Hero>
      {lab.description ? <SectionCard id="lab-about" title={t("aboutTitle")}><p className={styles.flowNote}>{lab.description}</p></SectionCard> : <Notice>{t("defaultAbout")}</Notice>}
      <ActionLinks actions={actions} />
      {lab.services && lab.services.length > 0 ? (
        <section className={styles.stack} aria-labelledby="lab-services">
          <h2 id="lab-services" className={styles.sectionTitle}>{t("servicesTitle")}</h2>
          <ul className={styles.labGrid}>
            {lab.services.map((svc) => (
              <LabCard
                key={svc.id}
                href={`/${locale}/diagnostics/labs/book?serviceId=${encodeURIComponent(svc.id)}&labId=${encodeURIComponent(lab.id)}`}
                title={pickText(locale, svc.name_ar ?? svc.name, svc.name_en ?? svc.name) ?? svc.name}
                sub={svc.sample_type}
                price={svc.price !== undefined ? money(locale, svc.price) : undefined}
              />
            ))}
          </ul>
        </section>
      ) : null}
    </ConsultPage>
  );
}
