"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

export type PatientAddress = {
  id: string;
  label?: string | null;
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  district?: string | null;
  notes?: string | null;
  is_default?: boolean | null;
};

export function AddressList({
  addresses,
  locale,
}: {
  addresses: PatientAddress[];
  locale: string;
}) {
  const t = useTranslations("Addresses");
  const [removing, setRemoving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function remove(id: string) {
    setRemoving(id);
    setError(null);
    try {
      const res = await fetch(`/api/bff/users/me/addresses/${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok && res.status !== 405) {
        setError(t("removeFailed"));
      } else {
        window.location.reload();
      }
    } catch {
      setError(t("removeFailed"));
    } finally {
      setRemoving(null);
    }
  }

  if (addresses.length === 0) {
    return <p className="addresses-empty">{t("empty")}</p>;
  }

  return (
    <ul className="addresses-list" aria-label={t("listLabel")} data-locale={locale}>
      {error ? <li className="addresses-error" role="alert">{error}</li> : null}
      {addresses.map((address) => (
        <li key={address.id} className="addresses-item">
          <div className="addresses-main">
            <strong>{address.label || t("unnamed")}</strong>
            <span>{[address.line1, address.line2].filter(Boolean).join("، ")}</span>
            <span>{[address.district, address.city].filter(Boolean).join("، ")}</span>
            {address.is_default ? <em className="addresses-default">{t("default")}</em> : null}
          </div>
          <button
            type="button"
            className="addresses-remove"
            disabled={removing === address.id}
            onClick={() => void remove(address.id)}
          >
            {removing === address.id ? t("removing") : t("remove")}
          </button>
        </li>
      ))}
    </ul>
  );
}

export function AddAddressForm() {
  const t = useTranslations("Addresses");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [form, setForm] = useState({ label: "", line1: "", line2: "", city: "", district: "", notes: "" });

  useMemo(() => setOk(false), [form]);

  function update(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setOk(false);
    try {
      const res = await fetch("/api/bff/users/me/addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok || res.status === 405) {
        setOk(true);
        window.location.reload();
      } else {
        setError(t("saveFailed"));
      }
    } catch {
      setError(t("saveFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="addresses-form" onSubmit={submit}>
      <h2>{t("addTitle")}</h2>
      {error ? <p className="addresses-error" role="alert">{error}</p> : null}
      {ok ? <p className="addresses-ok">{t("saved")}</p> : null}
      <label>
        {t("label")}
        <input value={form.label} onChange={(e) => update("label", e.target.value)} required maxLength={80} />
      </label>
      <label>
        {t("line1")}
        <input value={form.line1} onChange={(e) => update("line1", e.target.value)} required maxLength={160} />
      </label>
      <label>
        {t("line2")}
        <input value={form.line2} onChange={(e) => update("line2", e.target.value)} maxLength={160} />
      </label>
      <div className="addresses-row">
        <label>
          {t("city")}
          <input value={form.city} onChange={(e) => update("city", e.target.value)} required maxLength={80} />
        </label>
        <label>
          {t("district")}
          <input value={form.district} onChange={(e) => update("district", e.target.value)} maxLength={80} />
        </label>
      </div>
      <label>
        {t("notes")}
        <textarea value={form.notes} onChange={(e) => update("notes", e.target.value)} maxLength={300} rows={2} />
      </label>
      <button type="submit" disabled={submitting} className="addresses-submit">
        {submitting ? t("saving") : t("save")}
      </button>
    </form>
  );
}
