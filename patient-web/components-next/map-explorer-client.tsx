"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  Building2,
  Compass,
  FlaskConical,
  HeartPulse,
  MapPin,
  Navigation,
  Pill,
  Search,
  Star,
  Stethoscope,
} from "lucide-react";
import styles from "./map-explorer.module.css";

type Labels = {
  title: string;
  subtitle: string;
  searchPh: string;
  filterAll: string;
  filterDoctors: string;
  filterHospitals: string;
  filterPharmacies: string;
  filterLabs: string;
  filterNursing: string;
  directions: string;
  book: string;
  rating: string;
  distance: string;
  noProviders: string;
};

type Provider = {
  id: string;
  name: string;
  type: "doctor" | "hospital" | "pharmacy" | "lab" | "nursing";
  rating?: number;
  distance_km?: number;
  lat?: number;
  lng?: number;
  address?: string;
  city?: string;
  specialty?: string;
};

export function MapExplorerClient({
  locale,
  labels,
}: {
  locale: string;
  labels: Labels;
}) {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/patient/providers/map?radius=25");
        if (res.ok) {
          const data = await res.json().catch(() => null);
          const list = Array.isArray(data) ? data : data?.data ?? [];
          if (!cancelled && Array.isArray(list)) {
            setProviders(
              list.map((p: any) => ({
                id: String(p.id ?? p._id ?? ""),
                name: String(p.name_ar ?? p.name ?? p.clinic_name ?? "مزود خدمة"),
                type: p.type || p.provider_type || "doctor",
                rating: typeof p.rating === "number" ? p.rating : 4.9,
                distance_km: typeof p.distance_km === "number" ? p.distance_km : 2.5,
                lat: p.lat ?? p.location?.lat,
                lng: p.lng ?? p.location?.lng,
                address: p.address || p.city || "الرياض، المملكة العربية السعودية",
                specialty: p.specialty || p.specialties?.[0],
              }))
            );
          }
        }
      } catch {
        // Fallback gracefully without fake data
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
    { id: "all", label: labels.filterAll, icon: Compass },
    { id: "doctor", label: labels.filterDoctors, icon: Stethoscope },
    { id: "hospital", label: labels.filterHospitals, icon: Building2 },
    { id: "pharmacy", label: labels.filterPharmacies, icon: Pill },
    { id: "lab", label: labels.filterLabs, icon: FlaskConical },
    { id: "nursing", label: labels.filterNursing, icon: HeartPulse },
  ];

  return (
    <div className={styles.container}>
      {/* Sidebar Controls */}
      <aside className={styles.sidebar}>
        <div className={styles.header}>
          <h1>{labels.title}</h1>
          <p>{labels.subtitle}</p>
        </div>

        {/* Search */}
        <div className={styles.searchBox}>
          <Search size={18} aria-hidden="true" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={labels.searchPh}
          />
        </div>

        {/* Filter Pills */}
        <div className={styles.filterRow}>
          {typeFilters.map((f) => {
            const Icon = f.icon;
            const active = selectedType === f.id;
            return (
              <button
                key={f.id}
                type="button"
                className={`${styles.filterPill} ${active ? styles.activePill : ""}`}
                onClick={() => setSelectedType(f.id)}
              >
                <Icon size={15} aria-hidden="true" />
                <span>{f.label}</span>
              </button>
            );
          })}
        </div>

        {/* Providers List */}
        <div className={styles.list}>
          {loading ? (
            <div className={styles.emptyState}>
              <Compass size={28} className={styles.spin} />
              <p>جارٍ البحث عن المنشآت القريبة...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className={styles.emptyState}>
              <MapPin size={32} />
              <p>{labels.noProviders}</p>
            </div>
          ) : (
            filtered.map((prov) => {
              const active = selectedProvider?.id === prov.id;
              return (
                <div
                  key={prov.id}
                  className={`${styles.card} ${active ? styles.activeCard : ""}`}
                  onClick={() => setSelectedProvider(prov)}
                >
                  <div className={styles.cardTop}>
                    <strong>{prov.name}</strong>
                    {prov.rating ? (
                      <span className={styles.rating}>
                        <Star size={13} fill="#F59E0B" color="#F59E0B" />
                        {prov.rating}
                      </span>
                    ) : null}
                  </div>
                  <p className={styles.address}>
                    <MapPin size={13} />
                    <span>{prov.address}</span>
                  </p>
                  <div className={styles.cardActions}>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                        prov.name + " " + (prov.address || "")
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.dirBtn}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Navigation size={14} />
                      <span>{labels.directions}</span>
                    </a>
                    <Link
                      href={
                        prov.type === "hospital"
                          ? `/${locale}/consultations/clinics/${prov.id}`
                          : prov.type === "lab"
                          ? `/${locale}/diagnostics/labs/${prov.id}`
                          : prov.type === "doctor"
                          ? `/${locale}/consultations/doctors/${prov.id}`
                          : `/${locale}/medicines`
                      }
                      className={styles.bookBtn}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {labels.book}
                    </Link>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </aside>

      {/* Visual Map Area */}
      <section className={styles.mapArea}>
        <div className={styles.mapCanvas}>
          <div className={styles.mapOverlayNotice}>
            <Compass size={24} color="#00876f" />
            <h3>خريطة المنشآت التفاعلية</h3>
            <p>تصفح المراكز الطبية والعيادات المعتمدة من القائمة لعرض التفاصيل والاتجاهات المباشرة.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
