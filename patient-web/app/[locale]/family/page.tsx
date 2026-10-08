import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { extractFamilyMembers } from "@/lib/api/family";
import { parseFamilyGroup } from "@/lib/api/family-group";
import { getPatientFamilyGroup, getPatientFamilyMembers, getPatientFamilyPendingRequests } from "@/lib/api/family-server";
import { familyMemberRef } from "@/lib/api/family-member-ref";
import { requirePatientAccess } from "@/lib/auth/session";
import { formatDate } from "@/lib/format-date";
import { getDirection, isLocale } from "@/lib/i18n";
import { knownPermissions, PERMISSION_KEYS, parseGroupPermissions, parsePermissionRequests } from "@/lib/family/view";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { ConsultState } from "@/components-next/consult/consult-state";
import { RowCard } from "@/components-next/consult/consult-parts";
import { CreateFamily } from "@/components-next/family/create-family";
import { PermissionRequests } from "@/components-next/family/permission-requests";
import { PartUnavailable, SectionHead } from "@/components-next/health/health-kit";
import { ButtonLink } from "@/components-next/pharmacy/button-link";
import { Avatar } from "@/components-next/ui-generated/components/Surfaces";
import { FIcon } from "@/components-next/ui-generated/components/FIcon";
import { Icon } from "@/components-next/ui-generated/src/Icon";
import { SERVICE_ICONS } from "@/components-next/ui-generated/icons/fill";
import rx from "@/components-next/pharmacy/rx.module.css";
import health from "@/components-next/health/health.module.css";
import styles from "@/components-next/family/family.module.css";

type Props = { params: Promise<{ locale: string }> };

const FAMILY = SERVICE_ICONS.family;

/**
 * The family hub (canvas/Family; merge map A, `/family` is canonical): the members with their permission badge, the way to
 * add or join, the **Requests** section (the old permission-requests screen: the pending requests with Approve and Reject),
 * and the calendar, chat and emergency-contact rows. Members come from GET /family/members and the group (name, grants) from
 * GET /family/my-group; the requests from GET /family/permissions/pending, and say so in place when they cannot load.
 */
export default async function FamilyPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("FamilyWeb");
  const rs = await getTranslations("RouteState");
  const token = await requirePatientAccess(locale);
  const base = `/${locale}/family`;

  const unavailable = (
    <ConsultPage locale={locale} title={t("title")}>
      <ConsultState kind="error" title={t("unavailableTitle")} body={t("unavailable")} retryLabel={rs("retry")} />
    </ConsultPage>
  );
  let response: Response;
  let groupResponse: Response | null;
  try {
    [response, groupResponse] = await Promise.all([getPatientFamilyMembers(token), getPatientFamilyGroup(token).catch(() => null)]);
  } catch {
    return unavailable;
  }
  if (response.status === 401) redirect(`/${locale}/login`);
  // F70: no family yet → create-family CTA instead of a bare 404.
  if (response.status === 404) {
    return (
      <ConsultPage locale={locale} title={t("title")}>
        <CreateFamily />
      </ConsultPage>
    );
  }
  if (response.status === 403) notFound();
  if (!response.ok) return unavailable;

  const members = extractFamilyMembers(await response.json().catch(() => null));
  const groupPayload = groupResponse?.ok ? await groupResponse.json().catch(() => null) : null;
  const group = groupPayload ? parseFamilyGroup(groupPayload) : null;
  const grants = groupPayload ? parseGroupPermissions(groupPayload) : new Map<string, string[]>();

  let requests: ReturnType<typeof parsePermissionRequests> | null = null;
  try {
    const pending = await getPatientFamilyPendingRequests(token);
    if (pending.ok) requests = parsePermissionRequests(await pending.json().catch(() => null));
  } catch { /* said in place below */ }

  const caret = getDirection(locale) === "rtl" ? "caret-left" : "caret-right";
  const count = group?.memberCount ?? members.length;

  return (
    <ConsultPage locale={locale} title={t("title")}>
      <div className={styles.toolbar}>
        <p className={rx.lead}>{group?.name ? <><bdi>{group.name}</bdi>{" · "}</> : null}{t("membersCount", { count })}</p>
        <Link href={`${base}/add`} className={health.iconButton} aria-label={t("addMember")}>
          <Icon name="plus" size={22} tone="currentColor" />
        </Link>
      </div>

      <section className={`${rx.card} ${styles.stack}`} aria-label={t("heroTitle")}>
        <div className={styles.heroRow}>
          <FIcon icon={FAMILY.icon} tone={FAMILY.tone} size={52} chip="solid" />
          <span className={styles.heroText}>
            <h2 className={styles.heroTitle}>{t("heroTitle")}</h2>
            <span className={styles.heroSub}>{t("heroSub")}</span>
          </span>
        </div>
        <div className={styles.heroActions}>
          <ButtonLink href={`${base}/add?tab=invite`} label={t("heroAdd")} size="md" />
          <ButtonLink href={`${base}/add?tab=join`} label={t("heroJoin")} size="md" variant="outline" />
        </div>
      </section>

      <SectionHead id="members" title={t("members")} />
      {members.length === 0 ? (
        <ConsultState kind="empty" icon={FAMILY.icon} title={t("members")} body={t("empty")} actionLabel={t("heroAdd")} actionHref={`${base}/add?tab=invite`} />
      ) : (
        <section className={`${rx.card} ${rx.cardFlush}`} aria-labelledby="members">
          <ul className={styles.rows}>
            {members.map((member) => {
              const name = member.displayName || t("member");
              const granted = grants.has(member.id) ? knownPermissions(grants.get(member.id) ?? []).length : null;
              const joined = formatDate(locale, member.joinedAt);
              const sub = [member.role === "owner" ? t("owner") : t("memberRole"), member.relation, joined].filter(Boolean).join(" · ");
              return (
                <li key={member.id}>
                  <Link className={styles.memberRow} href={`${base}/${familyMemberRef(member.id)}`}>
                    <Avatar name={name} size="md" />
                    <span className={styles.memberBody}>
                      <span className={styles.memberName}>{name}</span>
                      <span className={styles.memberSub}>{sub}</span>
                    </span>
                    {granted !== null ? <span className={styles.badge}><bdi>{t("permsBadge", { count: granted, total: PERMISSION_KEYS.length })}</bdi></span> : null}
                    <span className={styles.caret}><Icon name={caret} size={18} tone="currentColor" /></span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <SectionHead id="requests" title={requests && requests.length ? t("requestsCount", { count: requests.length }) : t("requests")} />
      {requests === null ? (
        <PartUnavailable>{t("requestsUnavailable")}</PartUnavailable>
      ) : requests.length === 0 ? (
        <p className={rx.note} role="status">{t("requestsEmpty")}</p>
      ) : (
        <PermissionRequests requests={requests} />
      )}

      <RowCard href={`${base}/calendar`} icon="calendar-dots" tone="coral" title={t("calendarTitle")} sub={t("calendarSub")} caret={<Icon name={caret} size={16} tone="secondary" />} />
      <RowCard href={`${base}/chat`} icon="chat-circle-text" tone="blue" title={t("chatTitle")} sub={t("chatSub")} caret={<Icon name={caret} size={16} tone="secondary" />} />
      <RowCard href={`/${locale}/health/profile#emergency`} icon="users" tone="amber" title={t("emergencyTitle")} sub={t("emergencySub")} caret={<Icon name={caret} size={16} tone="secondary" />} />
    </ConsultPage>
  );
}
