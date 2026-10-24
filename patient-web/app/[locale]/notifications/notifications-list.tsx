"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Card, Chip, SectionHeader } from "@/components-next/ui-generated/components/Surfaces";
import { FIcon } from "@/components-next/ui-generated/components/FIcon";
import type { FillIconName, ServiceTone } from "@/components-next/ui-generated/icons/fill";
import styles from "./notifications.module.css";

export type NotificationRowData = {
  id: string;
  title: string | null;
  body: string | null;
  when: { text: string; iso: string } | null;
  icon: FillIconName;
  tone: ServiceTone;
  unread: boolean;
  /** The web page the notification opens, resolved on the server (null: the row only marks it as read). */
  href: string | null;
  /** The app's filter group for the kind (system, medical, promotion). */
  category: NotificationCategory;
};
export type NotificationCategory = "system" | "medical" | "promotion";
export const NOTIFICATION_CATEGORIES: NotificationCategory[] = ["system", "medical", "promotion"];
export type NotificationGroup = { key: string; title: string; items: NotificationRowData[] };

/** POST /api/patient/notifications/:id/read (or /read-all): the BFF forwards it to the backend with the session. */
async function post(path: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/patient/notifications/${path}`, { method: "POST", headers: { "idempotency-key": crypto.randomUUID() }, keepalive: true });
    return response.ok;
  } catch {
    return false;
  }
}

/** The notification rows: tapping one marks it as read (the unread dot clears at once) and opens its page when the web has one. */
export function NotificationsList({ groups }: { groups: NotificationGroup[] }) {
  const t = useTranslations("Notifications");
  const router = useRouter();
  const [readIds, setReadIds] = useState<Set<string>>(() => new Set());
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState<NotificationCategory | "all">("all");
  const categories = NOTIFICATION_CATEGORIES.filter((c) => groups.some((g) => g.items.some((i) => i.category === c)));
  const active = filter !== "all" && categories.includes(filter) ? filter : "all";
  const visible = groups.map((g) => ({ ...g, items: active === "all" ? g.items : g.items.filter((i) => i.category === active) })).filter((g) => g.items.length > 0);

  const isUnread = (item: NotificationRowData) => item.unread && !readIds.has(item.id);
  const unreadCount = groups.reduce((sum, group) => sum + group.items.filter(isUnread).length, 0);

  async function markRead(item: NotificationRowData) {
    if (!isUnread(item)) return;
    setFailed(false);
    setReadIds((current) => new Set(current).add(item.id));
    if (!(await post(`${encodeURIComponent(item.id)}/read`))) {
      setReadIds((current) => { const next = new Set(current); next.delete(item.id); return next; });
      setFailed(true);
    }
  }

  async function markAll() {
    if (busy || unreadCount === 0) return;
    setBusy(true); setFailed(false);
    const ok = await post("read-all");
    if (ok) {
      setReadIds(new Set(groups.flatMap((group) => group.items.map((item) => item.id))));
      router.refresh();
    } else setFailed(true);
    setBusy(false);
  }

  return <>
    {unreadCount > 0 ? <div className={styles.tools}><button type="button" className={styles.markAll} onClick={markAll} disabled={busy}>{t("markAllRead")}</button></div> : null}
    {failed ? <p className={styles.failed} role="alert">{t("markFailed")}</p> : null}
    {categories.length > 1 ? <div className={styles.chips} role="group" aria-label={t("filters")}>
      <Chip label={t("filterAll")} selected={active === "all"} onClick={() => setFilter("all")} />
      {categories.map((c) => <Chip key={c} label={t(`filter_${c}`)} selected={active === c} onClick={() => setFilter(c)} />)}
    </div> : null}
    {visible.map((group) => (
      <section key={group.key} className={styles.group} aria-label={group.title}>
        <SectionHeader title={group.title} />
        <Card padding="none">
          <ul className={styles.list}>
            {group.items.map((item) => {
              const unread = isUnread(item);
              const content = <>
                <FIcon icon={item.icon} tone={item.tone} size={42} />
                <span className={styles.body}>
                  <span className={`${styles.title} ${unread ? styles.titleUnread : ""}`}>{item.title || t("untitled")}</span>
                  {item.body ? <span className={styles.copy}>{item.body}</span> : null}
                  {item.when ? <time className={styles.time} dateTime={item.when.iso}>{item.when.text}</time> : null}
                </span>
                {unread ? <span className={styles.dot} role="img" aria-label={t("unread")} /> : null}
              </>;
              return <li key={item.id} className={`${styles.row} ${unread ? styles.unread : ""}`}>
                {item.href
                  ? <Link href={item.href} className={styles.rowInner} onClick={() => { void markRead(item); }}>{content}</Link>
                  : unread
                    ? <button type="button" className={styles.rowInner} onClick={() => { void markRead(item); }}>{content}</button>
                    : <div className={styles.rowInner}>{content}</div>}
              </li>;
            })}
          </ul>
        </Card>
      </section>
    ))}
  </>;
}
