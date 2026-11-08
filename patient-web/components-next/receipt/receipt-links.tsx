"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components-next/ui-generated/components/Button";
import { createShareLink, listShareLinks, revokeShareLink } from "@/lib/receipt/share-client";
import type { ReceiptKind, ShareLinkRow } from "@/lib/receipt/model";
import type { ReceiptLabels } from "@/lib/receipt/labels";
import { formatDate } from "@/lib/format-date";
import styles from "./receipt.module.css";

const DAYS = [1, 7, 30] as const;
type Props = Readonly<{ locale: string; kind: ReceiptKind; bookingId: string; labels: ReceiptLabels }>;

/**
 * "Share link": makes a read-only link to this receipt (POST .../share-link; the token is shown once), copies or shares it, shows
 * when it expires, and lists the links already made with their views, each revocable (DELETE .../share-links/:id).
 */
export function ReceiptLinks({ locale, kind, bookingId, labels }: Props) {
  const [days, setDays] = useState<number>(7);
  const [links, setLinks] = useState<ShareLinkRow[]>([]);
  const [fresh, setFresh] = useState<{ url: string; expiresAt: string | null } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    const rows = await listShareLinks(fetch, kind, bookingId);
    if (rows) setLinks(rows);
  }, [kind, bookingId]);
  useEffect(() => { void load(); }, [load]);

  async function create() {
    if (busy) return;
    setBusy(true); setError(null); setCopied(false);
    const made = await createShareLink(fetch, { kind, bookingId, days, locale, origin: window.location.origin, key: crypto.randomUUID() });
    setBusy(false);
    if (!made.ok) { setError(made.reason === "limit" ? labels.linkLimit : labels.linkFailed); return; }
    setFresh({ url: made.url, expiresAt: made.expiresAt });
    await load();
  }

  async function revoke(id: string) {
    setError(null);
    if (!(await revokeShareLink(fetch, kind, bookingId, id))) { setError(labels.linkRevokeFailed); return; }
    await load();
  }

  async function copy(url: string) {
    try { await navigator.clipboard.writeText(url); setCopied(true); } catch { setError(labels.linkFailed); }
  }
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";
  const status = { active: labels.linkStatusActive, expired: labels.linkStatusExpired, revoked: labels.linkStatusRevoked } as const;

  return (
    <section className={styles.panel} aria-label={labels.shareLink}>
      <h2 className={styles.panelTitle}>{labels.linkTitle}</h2>
      <p className={styles.panelBody}>{labels.linkBody}</p>
      <label className={styles.daysRow}>
        <span>{labels.linkDays}</span>
        <select value={days} onChange={(event) => setDays(Number(event.target.value))}>
          {DAYS.map((n) => <option key={n} value={n}>{new Intl.NumberFormat(locale).format(n)}</option>)}
        </select>
      </label>
      <Button label={labels.linkCreate} variant="outline" size="md" onClick={create} disabled={busy} />
      {error ? <p className={styles.error} role="alert">{error}</p> : null}
      {fresh ? (
        <div role="status">
          <input className={styles.linkField} readOnly value={fresh.url} aria-label={labels.shareLink} onFocus={(event) => event.currentTarget.select()} />
          <p className={styles.hint}>{labels.linkOnce}{fresh.expiresAt ? ` ${labels.linkExpires.replace("{date}", formatDate(locale, fresh.expiresAt, { dateStyle: "medium" }) ?? "")}` : ""}</p>
          <div className={styles.rowActions}>
            <Button label={copied ? labels.linkCopied : labels.linkCopy} variant="primary" size="md" onClick={() => copy(fresh.url)} />
            {canShare ? <Button label={labels.share} variant="outline" size="md" onClick={() => { void navigator.share({ title: labels.shareTitle, url: fresh.url }).catch(() => undefined); }} /> : null}
          </div>
        </div>
      ) : null}
      {links.length === 0 ? <p className={styles.hint}>{labels.linkNone}</p> : (
        <ul className={styles.linkRows}>
          {links.map((link) => (
            <li key={link.id} className={styles.linkRow}>
              <span className={styles.linkMeta}>
                <span>{status[link.status]}{link.expiresAt ? ` · ${labels.linkExpires.replace("{date}", formatDate(locale, link.expiresAt, { dateStyle: "medium" }) ?? "")}` : ""}</span>
                <span className={styles.hint}>{labels.linkViews.replace("{n}", new Intl.NumberFormat(locale).format(link.viewCount))}</span>
              </span>
              {link.status === "active" ? <Button label={labels.linkRevoke} variant="outline" size="sm" onClick={() => revoke(link.id)} /> : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
