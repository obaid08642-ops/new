"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components-next/ui-generated/components/Button";
import { Avatar } from "@/components-next/ui-generated/components/Surfaces";
import styles from "./health.module.css";
import forms from "@/components-next/consult/consult.module.css";

const MAX_BYTES = 5_000_000;
const TYPES = ["image/jpeg", "image/png", "image/webp"];

/** Profile photo (the app's "Change photo"): picks an image and sends it to POST /api/health/avatar, which uploads it and saves it on the user profile. */
export function AvatarUpload({ name, src }: { name: string; src?: string }) {
  const t = useTranslations("HealthWeb");
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState(src);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onPick(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!TYPES.includes(file.type) || file.size > MAX_BYTES) { setError(t("photoInvalid")); return; }
    setBusy(true);
    setError(null);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
      const res = await fetch("/api/health/avatar", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ data_url: dataUrl, name: file.name.slice(0, 200) }) });
      const body = (await res.json().catch(() => null)) as { url?: unknown } | null;
      if (!res.ok || typeof body?.url !== "string") { setError(t("photoFailed")); return; }
      setUrl(body.url);
      router.refresh();
    } catch {
      setError(t("photoFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.photo}>
      <Avatar name={name} size="lg" src={url} />
      <input ref={input} type="file" accept={TYPES.join(",")} hidden aria-label={t("photoChange")} onChange={(event) => void onPick(event)} />
      <Button variant="outline" size="sm" label={busy ? t("photoUploading") : t("photoChange")} loading={busy} onClick={() => input.current?.click()} />
      <span className={forms.muted}>{t("photoNote")}</span>
      {error ? <span className={forms.error} role="alert">{error}</span> : null}
    </div>
  );
}
