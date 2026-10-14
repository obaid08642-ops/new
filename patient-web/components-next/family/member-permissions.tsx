"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components-next/ui-generated/components/Button";
import { PERMISSION_KEYS } from "@/lib/family/view";
import rx from "@/components-next/pharmacy/rx.module.css";
import forms from "@/components-next/consult/consult.module.css";
import { PERMISSION_LABEL } from "./permission-labels";
import styles from "./family.module.css";

/**
 * One member's permissions (merge map B: the per-member part of the old permissions screen): the grants as a checklist, Save,
 * and "Remove from family". The same calls as before (PATCH and DELETE /api/family/members/:id/permissions); a grant the
 * server holds that this list does not draw is sent back unchanged. Removing asks for one more press.
 */
export function MemberPermissions({ memberId, granted, backHref }: { memberId: string; granted: string[]; backHref: string }) {
  const t = useTranslations("FamilyWeb");
  const router = useRouter();
  const [grants, setGrants] = useState<string[]>(granted);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const url = `/api/family/members/${encodeURIComponent(memberId)}/permissions`;

  function toggle(key: string) {
    setMessage(null);
    setGrants((current) => (current.includes(key) ? current.filter((item) => item !== key) : [...current, key]));
  }

  async function save() {
    setMessage(null);
    setSaving(true);
    try {
      const res = await fetch(url, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ permissions: grants }) });
      if (!res.ok) { setMessage({ kind: "error", text: t("permsFailed") }); return; }
      setMessage({ kind: "ok", text: t("permsSaved") });
      router.refresh();
    } catch {
      setMessage({ kind: "error", text: t("permsFailed") });
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    setMessage(null);
    setRemoving(true);
    try {
      const res = await fetch(url, { method: "DELETE" });
      if (!res.ok) { setMessage({ kind: "error", text: t("removeFailed") }); setConfirming(false); return; }
      router.push(backHref);
      router.refresh();
    } catch {
      setMessage({ kind: "error", text: t("removeFailed") });
      setConfirming(false);
    } finally {
      setRemoving(false);
    }
  }

  return (
    <section className={rx.card} aria-labelledby="family-grants">
      <h2 id="family-grants" className={rx.h2}>{t("permsTitle")}</h2>
      <ul className={styles.grants}>
        {PERMISSION_KEYS.map((key) => (
          <li key={key}>
            <label className={styles.grant}>
              <input type="checkbox" checked={grants.includes(key)} onChange={() => toggle(key)} />
              <span>{t(PERMISSION_LABEL[key])}</span>
            </label>
          </li>
        ))}
      </ul>
      {message ? <p className={message.kind === "ok" ? forms.ok : forms.error} role={message.kind === "ok" ? "status" : "alert"}>{message.text}</p> : null}
      <div className={styles.actionsRow}>
        <Button label={t("permsSave")} size="md" loading={saving} disabled={removing} onClick={() => void save()} />
        {confirming ? (
          <>
            <Button label={t("removeConfirm")} size="md" variant="outline" loading={removing} disabled={saving} onClick={() => void remove()} />
            <Button label={t("cancel")} size="md" variant="ghost" disabled={removing} onClick={() => setConfirming(false)} />
          </>
        ) : (
          <Button label={t("removeMember")} size="md" variant="outline" disabled={saving} onClick={() => setConfirming(true)} />
        )}
      </div>
    </section>
  );
}
