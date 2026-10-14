"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components-next/ui-generated/components/Button";
import { FIcon } from "@/components-next/ui-generated/components/FIcon";
import { SERVICE_ICONS } from "@/components-next/ui-generated/icons/fill";
import type { PermissionRequest } from "@/lib/family/view";
import rx from "@/components-next/pharmacy/rx.module.css";
import forms from "@/components-next/consult/consult.module.css";
import { PERMISSION_LABEL } from "./permission-labels";
import styles from "./family.module.css";

const FAMILY = SERVICE_ICONS.family;

/**
 * The "Requests" section of the family hub (merge map A, the old permission-requests screen): each pending request with
 * what it asks to see, and Approve / Reject. The answer is the same call as before (PUT /api/family/permissions/:id/respond
 * with `decision`), then the page's data is read again.
 */
export function PermissionRequests({ requests }: { requests: PermissionRequest[] }) {
  const t = useTranslations("FamilyWeb");
  const router = useRouter();
  const [acting, setActing] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  async function decide(id: string, decision: "approved" | "rejected") {
    setFailed(false);
    setActing(id);
    try {
      const res = await fetch(`/api/family/permissions/${encodeURIComponent(id)}/respond`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      if (!res.ok) { setFailed(true); return; }
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
        {requests.map((request) => (
          <li key={request.id} className={rx.card}>
            <div className={styles.requestHead}>
              <FIcon icon={FAMILY.icon} tone={FAMILY.tone} size={44} />
              <span className={styles.memberBody}>
                <span className={styles.memberName}>{request.name ?? t("member")}</span>
                <span className={styles.memberSub}>{request.permissions.length ? t("requestAsks") : t("requestNoPerms")}</span>
              </span>
            </div>
            {request.permissions.length ? (
              <span className={styles.chips}>
                {request.permissions.map((key) => <span className={styles.chip} key={key}>{t(PERMISSION_LABEL[key])}</span>)}
              </span>
            ) : null}
            <div className={styles.decide}>
              <Button label={t("approve")} size="md" loading={acting === request.id} disabled={acting !== null} onClick={() => void decide(request.id, "approved")} />
              <Button label={t("reject")} size="md" variant="outline" disabled={acting !== null} onClick={() => void decide(request.id, "rejected")} />
            </div>
          </li>
        ))}
      </ul>
      {failed ? <p className={forms.error} role="alert">{t("decisionFailed")}</p> : null}
    </>
  );
}
