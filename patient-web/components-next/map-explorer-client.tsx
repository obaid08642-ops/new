"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { DEFAULT_CENTRE, distanceFrom, filterProviders, locatable, mapPhase, nearestToCentre, resolveCentre, sortNearest, type MapPoint } from "@/lib/map/explorer-model";
import { currentPosition, geolocationPermission, savedAddressPoint } from "@/lib/map/explorer-browser";
import styles from "./map-explorer.module.css";

// MapLibre (~800 KB) loads only when this page opens, never on the server
const ProviderMap = dynamic(() => import("./provider-map-canvas"), { ssr: false, loading: () => null });

/** Issue 1550: the public read (no session needed); the patient proxy answered 401 to a guest and the map stayed empty. */
const MAP_URL = "/api/map/providers";

type Labels = {
  subtitle: string;
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
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<"map" | "list">("map");
  // where the map is centred: the position, else the saved address, else the default (lib/map/explorer-model.ts)
  const [centre, setCentre] = useState<{ point: MapPoint; source: "me" | "saved" | "default" }>({ point: DEFAULT_CENTRE, source: "default" });
  const track = useRef<HTMLUListElement>(null);
  const arriving = useRef<string | null>(null);
  // the carousel scrolls by itself too (first layout, a card brought into view): only a finger, wheel or key selects a provider
  const touched = useRef(false);
  const settle = useRef<number | undefined>(undefined);
  // "near me": a new request each press; the browser asks for the position only then
  const [focus, setFocus] = useState<{ lat: number; lng: number; seq: number } | null>(null);
  const [locate, setLocate] = useState<"idle" | "busy" | "denied">("idle");
  const [mapOff, setMapOff] = useState(false);
  const [canWebgl, setCanWebgl] = useState(true);
  useEffect(() => setCanWebgl(webglAvailable()), []);
  // the first centre: the position when the browser already allows it, else the saved address; never a prompt on load
  useEffect(() => {
    let alive = true;
    void resolveCentre({ permission: geolocationPermission, position: () => currentPosition(), saved: () => savedAddressPoint() }).then((next) => {
      if (!alive || next.source === "default") return;
      setCentre(next);
      setFocus((f) => ({ ...next.point, seq: (f?.seq ?? 0) + 1 }));
    });
    return () => { alive = false; };
  }, []);

  function nearMe() {
    if (typeof navigator === "undefined" || !navigator.geolocation) { setLocate("denied"); return; }
    setLocate("busy");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocate("idle");
        const point = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCentre({ point, source: "me" });
        setFocus((f) => ({ ...point, seq: (f?.seq ?? 0) + 1 }));
      },
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

  const shown = useMemo(() => sortNearest(filterProviders(providers, selectedType, searchQuery), centre.point), [providers, selectedType, searchQuery, centre.point]);
  const pins = useMemo(() => locatable(shown), [shown]);
  const phase = mapPhase({ loading, failed, total: providers.length, shown: shown.length, filtered: selectedType !== "all" || searchQuery.trim() !== "" });
  const km = useMemo(() => {
    try { return new Intl.NumberFormat(locale, { style: "unit", unit: "kilometer", unitDisplay: "short", maximumFractionDigits: 1 }); } catch { return new Intl.NumberFormat("en", { style: "unit", unit: "kilometer", maximumFractionDigits: 1 }); }
  }, [locale]);
  const reducedMotion = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

  /** A marker, a search hit or a card: select it. The map pans to it (the canvas does that); `scroll` also brings its card into view. */
  const select = useCallback((id: string | null, scroll: boolean) => {
    setSelectedId(id);
    if (!id || !scroll) return;
    const card = track.current?.querySelector<HTMLElement>(`[data-card="${CSS.escape(id)}"]`);
    if (!card) return;
    arriving.current = id;
    window.clearTimeout(settle.current);
    settle.current = window.setTimeout(() => { arriving.current = null; }, 800);
    card.scrollIntoView({ behavior: reducedMotion() ? "auto" : "smooth", inline: "center", block: "nearest" });
  }, []);

  /** A swipe settled: the card nearest the middle is the selected one, so the map pans to it. */
  function onTrackScroll() {
    window.clearTimeout(settle.current);
    settle.current = window.setTimeout(() => {
      const el = track.current;
      if (!el) return;
      if (arriving.current) { arriving.current = null; touched.current = false; return; }
      if (!touched.current) return;
      touched.current = false;
      const box = el.getBoundingClientRect();
      const cards = Array.from(el.querySelectorAll<HTMLElement>("[data-card]")).map((c) => {
        const r = c.getBoundingClientRect();
        return { id: c.dataset.card ?? "", x: r.x, width: r.width };
      });
      const id = nearestToCentre(cards, { x: box.x, width: box.width });
      if (id && id !== selectedId) select(id, false);
    }, 120);
  }

  const typeFilters: { id: string; label: string; glyph: { icon: FillIconName; tone: ServiceTone } | null }[] = [
    { id: "all", label: labels.filterAll, glyph: null },
    { id: "doctor", label: labels.filterDoctors, glyph: TYPE_ICON.doctor },
    { id: "hospital", label: labels.filterHospitals, glyph: TYPE_ICON.hospital },
    { id: "pharmacy", label: labels.filterPharmacies, glyph: TYPE_ICON.pharmacy },
    { id: "lab", label: labels.filterLabs, glyph: TYPE_ICON.lab },
    { id: "radiology", label: labels.filterRadiology, glyph: TYPE_ICON.radiology },
    { id: "nursing", label: labels.filterNursing, glyph: TYPE_ICON.nursing },
  ];

  const bookHref = (prov: Provider) => mapBookHref(locale, prov);

  function card(prov: Provider, inCarousel: boolean) {
    const glyph = TYPE_ICON[prov.type] ?? TYPE_ICON.doctor;
    const on = selectedId === prov.id;
    const away = distanceFrom(centre.point, prov);
    const sub = [prov.specialty, away !== null ? km.format(away) : null, prov.address].filter(Boolean).join(" · ");
    return (
      <li key={prov.id} data-card={prov.id} className={`${styles.card} ${inCarousel ? styles.slide : ""} ${on ? styles.cardOn : ""}`}>
        <button type="button" className={styles.cardMain} aria-pressed={on} onClick={() => select(prov.id, true)}>
          <FIcon icon={glyph.icon} tone={glyph.tone} size={44} />
          <span className={styles.cardText}>
            <span className={styles.cardTitle}>{prov.name}</span>
            {sub ? <span className={styles.cardSub}>{sub}</span> : null}
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
            <span className="nabd-button__label">{prov.type === "hospital" ? t("mapViewFacility") : labels.book}</span>
          </Link>
        </div>
      </li>
    );
  }

  const mapDrawn = canWebgl && !mapOff;
  // without WebGL the list is the only way to choose a provider, so it shows (the map is a secondary state then)
  const listShown = view === "list" || !mapDrawn;
  const showCards = !listShown && shown.length > 0;

  return (
    <div className={styles.stage}>
      <div className={styles.top}>
        <p id="map-subtitle" className={styles.lead}>{labels.subtitle}</p>
        <div className={styles.topRow}>
          <label className={`${forms.field} ${styles.search}`}>
            <span className={styles.srOnly}>{labels.searchPh}</span>
            <input className={forms.control} type="search" value={searchQuery} placeholder={labels.searchPh} onChange={(e) => setSearchQuery(e.target.value)} />
          </label>
          {mapDrawn ? (
            <div className={styles.views} role="group" aria-label={t("mapViews")}>
              <button type="button" className={forms.choice} aria-pressed={view === "map"} onClick={() => setView("map")}>{t("mapViewMap")}</button>
              <button type="button" className={forms.choice} aria-pressed={view === "list"} onClick={() => setView("list")}>{t("mapViewList")}</button>
            </div>
          ) : null}
        </div>
        <div className={styles.chips} role="group" aria-label={t("mapFilters")} aria-describedby="map-subtitle">
          {typeFilters.map((f) => (
            <button key={f.id} type="button" className={`${forms.choice} ${styles.chip}`} aria-pressed={selectedType === f.id} onClick={() => setSelectedType(f.id)}>
              {f.glyph ? <FIcon icon={f.glyph.icon} tone={f.glyph.tone} size={24} /> : null}
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className={`${styles.body} ${showCards ? styles.withCards : ""}`}>
        {/* The map pane: MapLibre with the hologram pins (OpenFreeMap tiles, no key, no tracking). Hidden, not unmounted, in the list view. */}
        {mapDrawn ? (
          <section className={`${styles.pane} ${view === "list" ? styles.paneOff : ""}`} aria-label={t("mapPane")} hidden={view === "list"}>
            <ProviderMap
              providers={pins}
              selectedId={selectedId}
              onSelect={(id) => select(id, true)}
              focus={focus}
              onUnavailable={() => setMapOff(true)}
              label={t("mapCanvasLabel")}
              zoomIn={t("mapZoomIn")}
              zoomOut={t("mapZoomOut")}
            />
            <button type="button" className={`nabd-button nabd-button--outline nabd-button--sm ${styles.nearMe}`} onClick={nearMe} disabled={locate === "busy"}>
              <span className="nabd-button__label">{locate === "busy" ? t("mapLocating") : t("mapNearMe")}</span>
            </button>
            {locate === "denied" ? <p className={styles.nearMeNote} role="status">{t("mapNearMeDenied")}</p> : centre.source === "saved" ? <p className={styles.centreNote} role="status">{t("mapCentredSaved")}</p> : null}
          </section>
        ) : null}

        {phase === "loading" ? <p className={`${styles.state} ${styles.floating}`} role="status"><Spinner />{t("mapLoading")}</p> : null}

        {phase === "failed" ? (
          <div className={`${styles.floating} ${styles.emptyCard} ${styles.stateError}`} role="alert">
            <p>{t("mapUnavailable")}</p>
            <button type="button" className="nabd-button nabd-button--outline nabd-button--sm" onClick={() => { setFailed(false); setLoading(true); setAttempt((n) => n + 1); }}>
              <span className="nabd-button__label">{t("mapRetry")}</span>
            </button>
          </div>
        ) : null}

        {phase === "empty" || phase === "emptyFiltered" ? (
          <div className={`${styles.floating} ${styles.emptyCard}`} role="status">
            <FIcon icon={SERVICE_ICONS.map.icon} tone={SERVICE_ICONS.map.tone} size={44} chip="soft" />
            <h2 className={styles.idleTitle}>{t(phase === "empty" ? "mapEmptyNearTitle" : "mapEmptyKindTitle")}</h2>
            <p className={styles.idleBody}>{t(phase === "empty" ? "mapEmptyNearBody" : "mapEmptyKindBody")}</p>
            {phase === "emptyFiltered" ? (
              <button type="button" className="nabd-button nabd-button--outline nabd-button--sm" onClick={() => { setSelectedType("all"); setSearchQuery(""); }}>
                <span className="nabd-button__label">{t("mapShowAll")}</span>
              </button>
            ) : null}
          </div>
        ) : null}

        {!mapDrawn && view === "map" ? <p className={styles.nearMeNote} role="status">{t("mapNoWebgl")}</p> : null}

        {listShown && shown.length > 0 ? <ul className={styles.list} aria-label={t("mapList")}>{shown.map((prov) => card(prov, false))}</ul> : null}

        {showCards ? (
          <ul ref={track} className={styles.track} aria-label={t("mapCarousel")} onScroll={onTrackScroll} onPointerDown={() => { touched.current = true; }} onWheel={() => { touched.current = true; }} onKeyDown={() => { touched.current = true; }}>
            {shown.slice(0, 40).map((prov) => card(prov, true))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
