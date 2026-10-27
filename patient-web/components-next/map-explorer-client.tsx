"use client";

import { useEffect, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { FIcon } from "@/components-next/ui-generated/components/FIcon";
import { FILL_ICON_PATHS, FILL_ICON_VIEWBOX, SERVICE_ICONS, type FillIconName, type ServiceTone } from "@/components-next/ui-generated/icons/fill";
import { Spinner } from "@/components-next/ui-generated/components/Spinner";
import { peekSwr, putSwr } from "@/lib/swr-lite";
import { mapBookHref } from "@/lib/map/book-href";
import { cityLabel, type CityNames } from "@/lib/api/city-names";
import forms from "@/components-next/consult/consult.module.css";
import { webglAvailable } from "@/lib/geo/map";
import styles from "./map-explorer.module.css";

// MapLibre (~800 KB) loads only when this page opens, never on the server
const ProviderMap = dynamic(() => import("./provider-map-canvas"), { ssr: false, loading: () => null });

/** Issue 1550: the public read (no session needed); the patient proxy answered 401 to a guest and the map stayed empty. */
const MAP_URL = "/api/map/providers";

type Labels = {
  searchPh: string;
  filterAll: string;
  filterDoctors: string;
  filterHospitals: string;
  filterPharmacies: string;
  filterLabs: string;
  filterRadiology: string;
  filterNursing: string;
  directions: string;
  book: string;
  noProviders: string;
};

type ProviderType = "doctor" | "hospital" | "pharmacy" | "lab" | "radiology" | "nursing";

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
  radiology: SERVICE_ICONS.radiology,
  doctor: SERVICE_ICONS.consult,
  hospital: { icon: "hospital", tone: "violet" }, // the app map: a hospital is violet, a doctor blue
  pharmacy: SERVICE_ICONS.pharmacy,
  lab: SERVICE_ICONS.lab,
  nursing: SERVICE_ICONS.nursing,
};

/**
 * The facilities map (GET /providers/map, public): a search field, the type filters, the list of providers with directions
 * and booking, and the OpenStreetMap pane of the chosen one. The list is the server's; nothing is invented when it is empty.
 */
export function MapExplorerClient({ locale, labels, cityNames, initialType = null }: { locale: string; labels: Labels; cityNames?: CityNames; initialType?: ProviderType | null }) {
  const t = useTranslations("AccountWeb");
  // The list the last visit in this tab received shows at once; the request below replaces it (lib/swr-lite.ts).
  const [providers, setProviders] = useState<Provider[]>(() => peekSwr<Provider[]>(MAP_URL) ?? []);
  const [loading, setLoading] = useState(() => peekSwr<Provider[]>(MAP_URL) === undefined);
  // the list could not be read (no answer or an error answer): said so with a retry, never shown as "no facilities"
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [selectedType, setSelectedType] = useState<string>(initialType ?? "all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  // "near me": a new request each press; the browser asks for the position only then
  const [focus, setFocus] = useState<{ lat: number; lng: number; seq: number } | null>(null);
  const [locate, setLocate] = useState<"idle" | "busy" | "denied">("idle");
  const [mapOff, setMapOff] = useState(false);
  const [canWebgl, setCanWebgl] = useState(true);
  useEffect(() => setCanWebgl(webglAvailable()), []);

  function nearMe() {
    if (typeof navigator === "undefined" || !navigator.geolocation) { setLocate("denied"); return; }
    setLocate("busy");
    navigator.geolocation.getCurrentPosition(
      (pos) => { setLocate("idle"); setFocus((f) => ({ lat: pos.coords.latitude, lng: pos.coords.longitude, seq: (f?.seq ?? 0) + 1 })); },
      () => setLocate("denied"),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    );
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(MAP_URL);
        if (!res.ok) {
          if (!cancelled && peekSwr<Provider[]>(MAP_URL) === undefined) setFailed(true);
        } else {
          const data = await res.json().catch(() => null);
          const list = Array.isArray(data) ? data : data?.data ?? [];
          if (!cancelled && Array.isArray(list)) {
            const next: Provider[] =
              list.map((p: Record<string, any>) => ({
                id: String(p.id ?? p._id ?? ""),
                name: String((locale === "ar" || locale === "ur" ? p.name_ar ?? p.name_en : p.name_en ?? p.name_ar) ?? p.name ?? p.clinic_name ?? ""),
                type: p.type || p.provider_type || "doctor",
                rating: typeof p.rating === "number" ? p.rating : undefined,
                distance_km: typeof p.distance_km === "number" ? p.distance_km : undefined,
                lat: p.lat ?? p.location?.lat,
                lng: p.lng ?? p.location?.lng,
                address: p.address || cityLabel(locale, p.city, cityNames) || undefined,
                specialty: p.specialty || p.specialties?.[0],
              }));
            putSwr(MAP_URL, next);
            setProviders(next);
            setFailed(false);
          }
        }
      } catch {
        // never made-up providers: the error line and its retry are shown instead
        if (!cancelled && peekSwr<Provider[]>(MAP_URL) === undefined) setFailed(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [attempt, locale, cityNames]);

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
    { id: "radiology", label: labels.filterRadiology },
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
        ) : failed ? (
          <div className={`${styles.state} ${styles.stateError}`} role="alert">
            <p>{t("mapUnavailable")}</p>
            <button type="button" className="nabd-button nabd-button--outline nabd-button--sm" onClick={() => { setFailed(false); setLoading(true); setAttempt((n) => n + 1); }}>
              <span className="nabd-button__label">{t("mapRetry")}</span>
            </button>
          </div>
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

      {/* The map pane: MapLibre with the hologram pins (OpenFreeMap tiles, no key, no tracking). */}
      <section className={styles.pane} aria-label={t("mapPane")}>
        {canWebgl && !mapOff ? (
          <>
            <ProviderMap
              providers={filtered}
              selectedId={selectedProvider?.id ?? null}
              onSelect={(id) => setSelectedProvider(filtered.find((p) => p.id === id) ?? null)}
              focus={focus}
              onUnavailable={() => setMapOff(true)}
              label={t("mapCanvasLabel")}
              zoomIn={t("mapZoomIn")}
              zoomOut={t("mapZoomOut")}
            />
            <button type="button" className={`nabd-button nabd-button--outline nabd-button--sm ${styles.nearMe}`} onClick={nearMe} disabled={locate === "busy"}>
              <span className="nabd-button__label">{locate === "busy" ? t("mapLocating") : t("mapNearMe")}</span>
            </button>
            {locate === "denied" ? <p className={styles.nearMeNote} role="status">{t("mapNearMeDenied")}</p> : null}
            {selectedProvider ? (
              <div className={styles.sheet} role="dialog" aria-label={selectedProvider.name}>
                <FIcon icon={(TYPE_ICON[selectedProvider.type] ?? TYPE_ICON.doctor).icon} tone={(TYPE_ICON[selectedProvider.type] ?? TYPE_ICON.doctor).tone} size={44} />
                <div className={styles.sheetText}>
                  <p className={styles.cardTitle}>{selectedProvider.name}</p>
                  {selectedProvider.specialty || selectedProvider.address ? <p className={styles.cardSub}>{[selectedProvider.specialty, selectedProvider.address].filter(Boolean).join(" - ")}</p> : null}
                </div>
                <div className={styles.cardActions}>
                  <a
                    href={selectedProvider.lat && selectedProvider.lng ? `https://www.openstreetmap.org/directions?to=${selectedProvider.lat}%2C${selectedProvider.lng}` : `https://www.openstreetmap.org/search?query=${encodeURIComponent(selectedProvider.name)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`nabd-button nabd-button--outline nabd-button--sm ${styles.action}`}
                  >
                    <span className="nabd-button__label">{labels.directions}</span>
                  </a>
                  <Link href={bookHref(selectedProvider)} className={`nabd-button nabd-button--primary nabd-button--sm ${styles.action}`}>
                    <span className="nabd-button__label">{selectedProvider.type === "hospital" ? t("mapViewFacility") : labels.book}</span>
                  </Link>
                  <button type="button" className={`nabd-button nabd-button--outline nabd-button--sm ${styles.action}`} onClick={() => setSelectedProvider(null)}>
                    <span className="nabd-button__label">{t("mapSheetClose")}</span>
                  </button>
                </div>
              </div>
            ) : null}
          </>
        ) : (
          <div className={styles.idle}>
            <FIcon icon={SERVICE_ICONS.map.icon} tone={SERVICE_ICONS.map.tone} size={64} chip="solid" />
            <h2 className={styles.idleTitle}>{t("mapIdleTitle")}</h2>
            <p className={styles.idleBody}>{t("mapNoWebgl")}</p>
          </div>
        )}
      </section>
    </div>
  );
}
