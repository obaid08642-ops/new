import Link from "next/link";
import { NavLink } from "@/components-next/nav/nav-link";
import { SoftLinks } from "@/components-next/nav/soft-links";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { DoctorCard } from "@/components-next/ui-generated/components/Cards";
import { FIcon } from "@/components-next/ui-generated/components/FIcon";
import { ListItem, SectionHeader, ServiceTile } from "@/components-next/ui-generated/components/Surfaces";
import { SERVICE_ICONS } from "@/components-next/ui-generated/icons/fill";
import type { FillIconName, ServiceName, ServiceTone } from "@/components-next/ui-generated/icons/fill";
import { NabdMark } from "@/components-next/nabd-mark";
import { doctorDisplayName, type DoctorRow } from "@/lib/api/doctors";
import { curatedHref } from "@/lib/curated";
import { formatNextSlot } from "@/lib/format-slot";
import { allowedImageUrl } from "@/lib/image-hosts";
import { specialtyLabel, type SpecialtySlug } from "@/lib/specialties";
import type { HomeSection } from "@/lib/api/public-config-server";
import type { Locale } from "@/lib/i18n";
import styles from "./home.module.css";

type T = Awaited<ReturnType<typeof getTranslations>>;

/** Service tones that are also CSS colour names, taken from the handoff service map (the colours stay in the tokens). */
const TONE = { care: SERVICE_ICONS.nursing.tone, rx: SERVICE_ICONS.pharmacy.tone, food: SERVICE_ICONS.nutrition.tone } as const;

/** The ECG line of the board, drawn once (decorative). */
function PulseLine() {
  return (
    <svg className={styles.pulse} viewBox="0 0 700 40" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <path
        className={styles.pulsePath}
        d="M0 26 H300 L318 26 L330 8 L344 38 L358 4 L372 30 L384 26 H700"
        pathLength={100}
        fill="none"
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** HomeWeb hero: eyebrow, title, pulse line and the search field (a plain GET form to /search). */
export function HeroCard({ locale, t, eyebrow, title, headingId }: { locale: Locale; t: T; eyebrow?: string; title: string; headingId: string }) {
  return (
    <section className={`${styles.hero} ${styles.rise}`} aria-labelledby={headingId}>
      <span className={styles.heroMark}><NabdMark size={34} variant="text" /></span>
      <div className={styles.heroText}>
        {eyebrow ? <p className={styles.eyebrow}>{eyebrow}</p> : null}
        <h1 id={headingId} className={styles.title}>{title}</h1>
      </div>
      <PulseLine />
      <form className={styles.search} action={`/${locale}/search`} method="get" role="search">
        <FIcon icon="magnifying-glass" tone="ink" chip="none" size={22} />
        <input className={styles.searchInput} type="search" name="q" maxLength={100} placeholder={t("searchPlaceholder")} aria-label={t("searchLabel")} enterKeyHint="search" autoComplete="off" />
        <button type="submit" className={styles.searchBtn}>{t("searchButton")}</button>
      </form>
    </section>
  );
}

/** The next appointment (HomeWeb: the white card beside the hero). Rendered only for a real appointment. */
export function AppointmentCard({
  locale,
  t,
  appointment,
}: {
  locale: Locale;
  t: T;
  appointment: { id: string; doctorName: string | null; dateLabel: string | null; status: string | null };
}) {
  const date = appointment.dateLabel ? new Date(appointment.dateLabel) : null;
  const valid = date && !Number.isNaN(date.valueOf()) ? date : null;
  const day = valid ? new Intl.DateTimeFormat(locale, { day: "numeric" }).format(valid) : null;
  const month = valid ? new Intl.DateTimeFormat(locale, { month: "short" }).format(valid) : null;
  const time = valid ? new Intl.DateTimeFormat(locale, { timeStyle: "short" }).format(valid) : null;
  const meta = [time, appointment.status].filter(Boolean).join(" · ");
  return (
    <div className={`${styles.appt} ${styles.rise}`}>
      {day && month ? (
        <div className={styles.apptDate} aria-hidden="true">
          <span className={styles.apptDay}>{day}</span>
          <span className={styles.apptMonth}>{month}</span>
        </div>
      ) : null}
      <div className={styles.apptBody}>
        <span className={styles.apptLabel}>{t("nextAppointment")}</span>
        {appointment.doctorName ? <span className={styles.apptName}>{appointment.doctorName}</span> : null}
        {meta ? <span className={styles.apptMeta}>{meta}</span> : null}
      </div>
      <Link className={styles.outlineBtn} href={`/${locale}/appointments/${encodeURIComponent(appointment.id)}`}>{t("details")}</Link>
    </div>
  );
}

/** The nine services of HomeWeb, each the shared ServiceTile inside a link. */
/** The four sections of the tab bar: their pages are fetched once the page is idle; the other tiles on touch or hover. */
const MAIN_SERVICES = new Set<ServiceName>(["consult", "pharmacy", "lab", "nursing"]);

export function ServiceGrid({ locale, t, signedIn = false }: { locale: Locale; t: T; signedIn?: boolean }) {
  const base = `/${locale}`;
  const items: Array<{ name: ServiceName; label: string; href: string }> = [
    { name: "consult", label: t("svcConsult"), href: `${base}/consultations/doctors` },
    { name: "pharmacy", label: t("svcPharmacy"), href: `${base}/c` },
    { name: "lab", label: t("svcLabs"), href: `${base}/diagnostics` },
    { name: "nursing", label: t("svcNursing"), href: `${base}/nursing/catalog` },
    { name: "nutrition", label: t("svcNutrition"), href: `${base}/nutrition` },
    { name: "maternity", label: t("svcMaternity"), href: `${base}/maternity` },
    { name: "map", label: t("svcMap"), href: `${base}/map` },
    { name: "health", label: t("svcHealth"), href: `${base}/health` },
    { name: "emergency", label: t("svcEmergency"), href: `${base}/emergency` },
  ];
  return (
    <section aria-label={t("services")}>
      <ul className={`${styles.services} ${styles.rise}`}>
        {items.map((s) => (
          <li key={s.name}>
            <NavLink href={s.href} className={styles.tileLink} prefetch={MAIN_SERVICES.has(s.name) ? "viewport" : "intent"} signedIn={signedIn}>
              <ServiceTile name={s.name} label={s.label} size="lg" />
            </NavLink>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** The smart assistant card: two modes of the assistant and the monthly report (owner decisions 4 and 7: no skin analysis, no chat entry). */
export function AiCard({ locale, t }: { locale: Locale; t: T }) {
  const base = `/${locale}/ai`;
  const tools: Array<{ icon: FillIconName; tone: ServiceTone; label: string; href: string }> = [
    { icon: "heartbeat", tone: TONE.care, label: t("aiSymptoms"), href: `${base}?mode=symptoms` },
    { icon: "translate", tone: "violet", label: t("aiTranslator"), href: `${base}?mode=prescription` },
    { icon: "chart-line-up", tone: "mint", label: t("aiReport"), href: `${base}/monthly-report` },
  ];
  return (
    <section className={styles.ai} aria-labelledby="home-ai-title">
      <div className={styles.aiHead}>
        <FIcon icon="sparkle" tone="violet" chip="solid" size={56} />
        <div className={styles.aiText}>
          <h2 id="home-ai-title" className={styles.aiTitle}>{t("aiTitle")}</h2>
          <span className={styles.aiSub}>{t("aiSub")}</span>
        </div>
        <Link href={base} className={styles.aiStart}>{t("aiStart")}</Link>
      </div>
      <ul className={styles.aiTools}>
        {tools.map((tool) => (
          <li key={tool.href}>
            <Link href={tool.href} className={styles.aiTool}>
              <FIcon icon={tool.icon} tone={tool.tone} chip="none" size={22} />
              <span>{tool.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

const MORE: Array<{ key: string; href: string; icon: FillIconName; tone: ServiceTone }> = [
  { key: "appointments", href: "appointments", icon: "calendar-dots", tone: "blue" },
  { key: "medicines", href: "medicines", icon: "pill", tone: TONE.rx },
  { key: "diagnostics", href: "diagnostics", icon: "test-tube", tone: "mint" },
  { key: "orders", href: "orders", icon: "package", tone: TONE.care },
  { key: "health", href: "health", icon: "heartbeat", tone: TONE.rx },
  { key: "homeCare", href: "home-care", icon: "first-aid-kit", tone: TONE.care },
  { key: "reminders", href: "health/medications?tab=all", icon: "clock-counter-clockwise", tone: "violet" },
  { key: "prescriptions", href: "prescriptions", icon: "prescription", tone: TONE.rx },
  { key: "family", href: "family", icon: "users-three", tone: "peach" },
  { key: "chat", href: "chat", icon: "chat-circle-text", tone: "blue" },
  { key: "notifications", href: "notifications", icon: "bell", tone: "amber" },
  { key: "search", href: "search", icon: "magnifying-glass", tone: "blue" },
  { key: "offers", href: "offers", icon: "gift", tone: "pink" },
  { key: "programs", href: "programs", icon: "heart", tone: "mint" },
  { key: "returns", href: "returns", icon: "arrows-left-right", tone: "amber" },
  { key: "nutrition", href: "nutrition", icon: "bowl-food", tone: TONE.food },
  { key: "maternity", href: "maternity", icon: "baby", tone: "pink" },
  { key: "aiTriage", href: "ai", icon: "sparkle", tone: "violet" },
  { key: "reports", href: "reports", icon: "file-text", tone: "blue" },
  { key: "loyalty", href: "loyalty", icon: "star", tone: "amber" },
  { key: "support", href: "support", icon: "headset", tone: TONE.care },
  { key: "emergency", href: "emergency", icon: "ambulance", tone: "peach" },
  { key: "profile", href: "profile", icon: "user", tone: "blue" },
  { key: "settings", href: "settings", icon: "gear", tone: "ink" },
  { key: "articles", href: "articles", icon: "clipboard-text", tone: "mint" },
];

/** Every other patient page, as the board's ListItem rows (the signed-in home; `labels` is the Dashboard namespace). */
export function AllServices({ locale, t, labels }: { locale: Locale; t: T; labels: T }) {
  return (
    <section className={styles.section} aria-label={t("allServices")}>
      <SectionHeader title={t("allServices")} />
      <ul className={styles.rows}>
        {MORE.map((m) => (
          <li key={m.key}>
            <Link href={`/${locale}/${m.href}`} className={styles.rowLink}>
              <ListItem title={labels(m.key)} leading={{ icon: m.icon, tone: m.tone }} />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Admin-curated home sections (GET /content/home): an image card per item. The admin stores a free-form `deep_link` (an app
 * route) and an image URL: the link is followed only when it is a page that exists on the web (under the page's locale), the
 * image only from the hosts next/image may load. Anything else renders the card as plain text instead of breaking the page.
 */
export function CuratedSections({ sections, locale, t }: { sections: HomeSection[]; locale: Locale; t: T }) {
  const ar = locale === "ar";
  const pick = (a?: string, e?: string) => (ar ? a || e : e || a) || "";
  return (
    <>
      {sections.map((section) => {
        const title = pick(section.title_ar, section.title_en);
        const items = (section.items ?? []).filter((item) => pick(item.title_ar, item.title_en));
        if (!items.length) return null;
        return (
          <section key={section.id || section.title_ar || title} className={styles.section} aria-label={title || t("offersTitle")}>
            {title ? <SectionHeader title={title} /> : null}
            <ul className={styles.cards}>
              {items.map((item) => {
                const label = pick(item.title_ar, item.title_en);
                const href = curatedHref(item.deep_link, locale);
                const image = allowedImageUrl(item.image_url);
                const body = (
                  <>
                    {image ? (
                      <span className={styles.cardMedia}>
                        <Image src={image} alt="" fill sizes="(min-width: 1024px) 300px, (min-width: 768px) 45vw, 78vw" />
                      </span>
                    ) : null}
                    <span className={styles.cardTitle}>{label}</span>
                  </>
                );
                return (
                  <li key={item.id || label}>
                    {href ? <Link href={href} className={styles.card}>{body}</Link> : <div className={styles.card}>{body}</div>}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </>
  );
}

/** Real doctors from GET /care/doctors; the section is absent when there are none. `specialties` is the SpecialtyNames translator. */
export function DoctorsSection({ doctors, locale, t, specialties }: { doctors: DoctorRow[]; locale: Locale; t: T; specialties: (key: SpecialtySlug) => string }) {
  const rows = doctors.flatMap((d) => { const name = doctorDisplayName(d, locale); return name ? [{ d, name }] : []; });
  if (!rows.length) return null;
  const number = new Intl.NumberFormat(locale);
  return (
    <section className={styles.section} aria-labelledby="home-doctors-title">
      <div className={styles.sectionHead}>
        <h2 id="home-doctors-title" className={styles.sectionTitle}>{t("doctorsTitle")}</h2>
        <NavLink href={`/${locale}/consultations/doctors`} className={styles.seeAll} prefetch="viewport">{t("seeAll")}</NavLink>
      </div>
      <SoftLinks className={styles.cards}>
        {rows.map(({ d, name }) => (
          <li key={d.id}>
            <DoctorCard
              name={name}
              href={`/${locale}/consultations/doctors/${encodeURIComponent(d.id)}`}
              grade={d.degree}
              specialty={specialtyLabel(specialties, d.specialty) ?? undefined}
              place={d.facility}
              rating={d.rating && d.reviews ? { value: d.rating, count: d.reviews } : undefined}
              nextSlot={formatNextSlot(d.nextSlot, locale) ?? undefined}
              price={d.price ? number.format(d.price) : undefined}
              currency={d.price ? t("currency") : undefined}
              bookLabel={t("bookNow")}
            />
          </li>
        ))}
      </SoftLinks>
    </section>
  );
}
