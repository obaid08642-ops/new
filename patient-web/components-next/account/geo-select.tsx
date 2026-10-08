"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import forms from "@/components-next/consult/consult.module.css";

type Option = { code: string; name_ar: string; name_en: string; parent_code?: string };
type Value = { region: string; city: string; district: string };

const API = `${process.env.NEXT_PUBLIC_API_URL || "https://api.nabd.plus"}/api/v1/locations`;

function readOptions(payload: unknown): Option[] {
  const root = payload && typeof payload === "object" && !Array.isArray(payload) ? (payload as { data?: unknown }) : null;
  const list = Array.isArray(payload) ? payload : Array.isArray(root?.data) ? root.data : [];
  return list.flatMap((item: unknown) => {
    const r = item && typeof item === "object" ? (item as Record<string, unknown>) : null;
    if (!r || typeof r.code !== "string") return [];
    return [{
      code: r.code,
      name_ar: typeof r.name_ar === "string" && r.name_ar ? r.name_ar : r.code,
      name_en: typeof r.name_en === "string" && r.name_en ? r.name_en : r.code,
      parent_code: typeof r.parent_code === "string" ? r.parent_code : undefined,
    }];
  });
}

/**
 * Region, city and district as three selects (GET /locations/regions, /cities, /districts?city=). The names come from the
 * server in Arabic and English; every other language shows the English name.
 */
export function GeoSelect({ value, onChange, locale }: { value: Value; onChange: (value: Value) => void; locale: string }) {
  const t = useTranslations("AccountWeb");
  const [regions, setRegions] = useState<Option[]>([]);
  const [allCities, setAllCities] = useState<Option[]>([]);
  const [districts, setDistricts] = useState<Option[]>([]);
  const name = (option: Option) => (locale === "ar" ? option.name_ar : option.name_en);

  useEffect(() => {
    fetch(`${API}/regions`).then((r) => r.json()).then((d) => setRegions(readOptions(d))).catch(() => undefined);
    fetch(`${API}/cities`).then((r) => r.json()).then((d) => setAllCities(readOptions(d))).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!value.city) { setDistricts([]); return; }
    fetch(`${API}/districts?city=${encodeURIComponent(value.city)}`).then((r) => r.json()).then((d) => setDistricts(readOptions(d))).catch(() => undefined);
  }, [value.city]);

  const cities = value.region ? allCities.filter((city) => city.parent_code === value.region) : [];

  return (
    <div className={forms.stack}>
      <label className={forms.field}>
        <span className={forms.label}>{t("geoRegion")}</span>
        <select className={forms.control} value={value.region} onChange={(event) => onChange({ region: event.target.value, city: "", district: "" })}>
          <option value="">{t("geoSelectRegion")}</option>
          {regions.map((region) => <option key={region.code} value={region.code}>{name(region)}</option>)}
        </select>
      </label>
      <label className={forms.field}>
        <span className={forms.label}>{t("geoCity")}</span>
        <select className={forms.control} value={value.city} disabled={!value.region} onChange={(event) => onChange({ region: value.region, city: event.target.value, district: "" })}>
          <option value="">{t("geoSelectCity")}</option>
          {cities.map((city) => <option key={city.code} value={city.code}>{name(city)}</option>)}
        </select>
      </label>
      <label className={forms.field}>
        <span className={forms.label}>{t("geoDistrict")}</span>
        <select className={forms.control} value={value.district} disabled={!value.city} onChange={(event) => onChange({ ...value, district: event.target.value })}>
          <option value="">{t("geoSelectDistrict")}</option>
          {districts.map((district) => <option key={district.code} value={district.code}>{name(district)}</option>)}
        </select>
      </label>
    </div>
  );
}
