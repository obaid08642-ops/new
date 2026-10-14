"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { FIcon } from "@/components-next/ui-generated/components/FIcon";
import { FILL_ICON_PATHS, FILL_ICON_VIEWBOX, SERVICE_ICONS, type FillIconName, type ServiceTone } from "@/components-next/ui-generated/icons/fill";
import { Spinner } from "@/components-next/ui-generated/components/Spinner";
import { peekSwr, putSwr } from "@/lib/swr-lite";
import { mapBookHref } from "@/lib/map/book-href";
import forms from "@/components-next/consult/consult.module.css";
import styles from "./map-explorer.module.css";

const MAP_URL = "/api/patient/providers/map?radius=25";

type Labels = {
  searchPh: string;
  filterAll: string;
  filterDoctors: string;
  filterHospitals: string;
  filterPharmacies: string;
  filterLabs: string;
  filterNursing: string;
  directions: string;
  book: string;
  noProviders: string;
};

type ProviderType = "doctor" | "hospital" | "pharmacy" | "lab" | "nursing";

type Provider = {
  id: string;
  name: string;
  type: ProviderType;
  rating?: number;
  distance_km?: number;
  lat?: number;
  lng?: number;
  address?: string;
  city?: string;
  specialty?: string;
};

/** The handoff service map's glyph and tone for each kind of provider (never written as colour names). */
const TYPE_ICON: Record<ProviderType, { icon: FillIconName; tone: ServiceTone }> = {
  doctor: SERVICE_ICONS.consult,
  hospital: { icon: "hospital", tone: SERVICE_ICONS.consult.tone },
  pharmacy: SERVICE_ICONS.pharmacy,
  lab: SERVICE_ICONS.lab,
  nursing: SERVICE_ICONS.nursing,
};

/**
 * The facilities map (GET /providers/map?radius=25): a search field, the type filters, the list of providers with directions
 * and booking, and the OpenStreetMap pane of the chosen one. The list is the server's; nothing is invented when it is empty.
 */
export function MapExplorerClient({ locale, labels }: { locale: string; labels: Labels }) {
  const t = useTranslations("AccountWeb");
  // The list the last visit in this tab received shows at once; the request below replaces it (lib/swr-lite.ts).
  const [providers, setProviders] = useState<Provider[]>(() => peekSwr<Provider[]>(MAP_URL) ?? []);
  const [loading, setLoading] = useState(() => peekSwr<Provider[]>(MAP_URL) === undefined);
  const [selectedType, setSelectedType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(MAP_URL);
        if (res.ok) {
          const data = await res.json().catch(() => null);
          const list = Array.isArray(data) ? data : data?.data ?? [];
          if (!cancelled && Array.isArray(list)) {
            const next: Provider[] =
              list.map((p: Record<string, any>) => ({
                id: String(p.id ?? p._id ?? ""),
                name: String(p.name_ar ?? p.name ?? p.clinic_name ?? ""),
                type: p.type || p.provider_type || "doctor",
                rating: typeof p.rating === "number" ? p.rating : undefined,
                distance_km: typeof p.distance_km === "number" ? p.distance_km : undefined,
                lat: p.lat ?? p.location?.lat,
                lng: p.lng ?? p.location?.lng,
                address: p.address || p.city || undefined,
                specialty: p.specialty || p.specialties?.[0],
              }));
            putSwr(MAP_URL, next);
            setProviders(next);
          }
        }
      } catch {
        // an empty list is shown, never made-up providers
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    return providers.filter((p) => {
      const matchesType = selectedType === "all" || p.type === selectedType;
      const matchesSearch =
        !searchQuery ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.specialty && p.specialty.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesType && matchesSearch;
    });
  }, [providers, selectedType, searchQuery]);

  const typeFilters = [
    { id: "all", label: labels.filterAll },
    { id: "doctor", label: labels.filterDoctors },
    { id: "hospital", label: labels.filterHospitals },
    { id: "pharmacy", label: labels.filterPharmacies },
    { id: "lab", label: labels.filterLabs },
    { id: "nursing", label: labels.filterNursing },
  ];

  const bookHref = (prov: Provider) => mapBookHref(locale, prov);

  return (
    <div className={styles.layout}>
      <div className={styles.side}>
        <label className={forms.field}>
          <span className={styles.srOnly}>{labels.searchPh}</span>
          <input className={forms.control} type="search" value={searchQuery} placeholder={labels.searchPh} onChange={(e) => setSearchQuery(e.target.value)} />
        </label>
        <div className={forms.choices} role="group" aria-label={t("mapFilters")}>
          {typeFilters.map((f) => (
            <button key={f.id} type="button" className={forms.choice} aria-pressed={selectedType === f.id} onClick={() => setSelectedType(f.id)}>
              {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <p className={styles.state} role="status"><Spinner />{t("mapLoading")}</p>
        ) : filtered.length === 0 ? (
          <p className={styles.state} role="status">{labels.noProviders}</p>
        ) : (
          <ul className={styles.list} aria-label={t("mapList")}>
            {filtered.map((prov) => {
              const glyph = TYPE_ICON[prov.type] ?? TYPE_ICON.doctor;
              return (
                <li key={prov.id} className={`${styles.card} ${selectedProvider?.id === prov.id ? styles.cardOn : ""}`}>
                  <button type="button" className={styles.cardMain} aria-pressed={selectedProvider?.id === prov.id} onClick={() => setSelectedProvider(prov)}>
                    <FIcon icon={glyph.icon} tone={glyph.tone} size={44} />
                    <span className={styles.cardText}>
                      <span className={styles.cardTitle}>{prov.name}</span>
                      {prov.address ? <span className={styles.cardSub}>{prov.address}</span> : null}
                    </span>
                    {prov.rating ? (
                      <span className={styles.rating}>
                        <svg aria-hidden="true" width={14} height={14} viewBox={FILL_ICON_VIEWBOX}><path d={FILL_ICON_PATHS.star} fill="var(--nabd-color-icon-ratingStar)" /></svg>
                        <bdi>{prov.rating}</bdi>
                      </span>
                    ) : null}
                  </button>
                  <div className={styles.cardActions}>
                    <a
                      href={prov.lat && prov.lng ? `https://www.openstreetmap.org/directions?to=${prov.lat}%2C${prov.lng}` : `https://www.openstreetmap.org/search?query=${encodeURIComponent(prov.name + " " + (prov.address || ""))}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`nabd-button nabd-button--outline nabd-button--sm ${styles.action}`}
                    >
                      <span className="nabd-button__label">{labels.directions}</span>
                    </a>
                    <Link href={bookHref(prov)} className={`nabd-button nabd-button--primary nabd-button--sm ${styles.action}`}>
                      <span className="nabd-button__label">{labels.book}</span>
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* The map pane: OpenStreetMap (open data, no tracking). */}
      <section className={styles.pane} aria-label={t("mapPane")}>
        {selectedProvider && selectedProvider.lat && selectedProvider.lng ? (
          <iframe
            title={selectedProvider.name}
            className={styles.frame}
            loading="lazy"
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${selectedProvider.lng - 0.015}%2C${selectedProvider.lat - 0.015}%2C${selectedProvider.lng + 0.015}%2C${selectedProvider.lat + 0.015}&layer=mapnik&marker=${selectedProvider.lat}%2C${selectedProvider.lng}`}
          />
        ) : (
          <div className={styles.idle}>
            <FIcon icon={SERVICE_ICONS.map.icon} tone={SERVICE_ICONS.map.tone} size={64} chip="solid" />
            <h2 className={styles.idleTitle}>{t("mapIdleTitle")}</h2>
            <p className={styles.idleBody}>{t("mapIdleBody")}</p>
            <p className={styles.idleNote}>{t("mapIdleNote")}</p>
          </div>
        )}
      </section>
    </div>
  );
}
