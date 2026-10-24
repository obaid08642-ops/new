"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components-next/ui-generated/components/Button";
import { FIcon } from "@/components-next/ui-generated/components/FIcon";
import { SERVICE_ICONS } from "@/components-next/ui-generated/icons/fill";
import { formatDate } from "@/lib/format-date";
import type { PermissionKey, PermissionRequest } from "@/lib/family/view";
import rx from "@/components-next/pharmacy/rx.module.css";
import forms from "@/components-next/consult/consult.module.css";
import { PERMISSION_LABEL } from "./permission-labels";
import styles from "./family.module.css";

const FAMILY = SERVICE_ICONS.family;

/**
 * The "Requests" section of the family hub (merge map A, the old permission-requests screen), as the app's sheet: each pending
 * request with the date and each requested permission that can be allowed or refused on its own, then Accept or Decline all
 * (PUT /api/family/permissions/:id/respond with `decision` and the allowed `permissions`), a confirmation, and the page's data read again.
 */
export function PermissionRequests({ requests }: { requests: PermissionRequest[] }) {
  const t = useTranslations("FamilyWeb");
  const locale = useLocale();
  const router = useRouter();
  const [acting, setActing] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [replied, setReplied] = useState(false);
  const [refused, setRefused] = useState<Record<string, PermissionKey[]>>({});

  function toggle(id: string, key: PermissionKey) {
    setReplied(false);
    setRefused((current) => {
      const list = current[id] ?? [];
      return { ...current, [id]: list.includes(key) ? list.filter((item) => item !== key) : [...list, key] };
    });
  }

  async function decide(request: PermissionRequest, decision: "approved" | "rejected") {
    setFailed(false);
    setReplied(false);
    setActing(request.id);
    const allowed = request.permissions.filter((key) => !(refused[request.id] ?? []).includes(key));
    try {
      const res = await fetch(`/api/family/permissions/${encodeURIComponent(request.id)}/respond`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(decision === "approved" ? { decision, permissions: allowed } : { decision }),
      });
      if (!res.ok) { setFailed(true); return; }
      setReplied(true);
      router.refresh();
    } catch {
      setFailed(true);
    } finally {
      setActing(null);
    }
  }

  return (
    <>
      <ul className={styles.requests}>
        {requests.map((request) => {
          const date = formatDate(locale, request.createdAt);
          const refusedHere = refused[request.id] ?? [];
          const none = request.permissions.length > 0 && refusedHere.length >= request.permissions.length;
          return (
            <li key={request.id} className={rx.card}>
              <div className={styles.requestHead}>
                <FIcon icon={FAMILY.icon} tone={FAMILY.tone} size={44} />
                <span className={styles.memberBody}>
                  <span className={styles.memberName}>{request.name ?? t("member")}</span>
                  <span className={styles.memberSub}>{[request.permissions.length ? t("requestAsks") : t("requestNoPerms"), date].filter(Boolean).join(" · ")}</span>
                </span>
              </div>
              {request.permissions.length ? (
                <ul className={styles.grants} aria-label={t("requestAsks")}>
                  {request.permissions.map((key) => (
                    <li key={key}>
                      <label className={styles.grant}>
                        <input type="checkbox" checked={!refusedHere.includes(key)} onChange={() => toggle(request.id, key)} />
                        <span>{t(PERMISSION_LABEL[key])}</span>
                        <span className={styles.memberSub}>{refusedHere.includes(key) ? t("reqRefused") : t("reqAllowed")}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              ) : null}
              <p className={rx.note}>{t("reqNote")}</p>
              <div className={styles.decide}>
                <Button label={t("reqAccept")} size="md" loading={acting === request.id} disabled={acting !== null || none} onClick={() => void decide(request, "approved")} />
                <Button label={t("reqDecline")} size="md" variant="outline" disabled={acting !== null} onClick={() => void decide(request, "rejected")} />
              </div>
            </li>
          );
        })}
      </ul>
      {failed ? <p className={forms.error} role="alert">{t("decisionFailed")}</p> : null}
      {replied ? <p className={forms.ok} role="status">{t("reqReplied")}</p> : null}
    </>
  );
}
