"use client";
import { useEffect, useState } from "react";

type Opt = { code: string; name_ar: string; name_en: string };

export function GeoPicker({ value, onChange, locale = "ar" }: {
  value?: { region?: string; city?: string; district?: string };
  onChange: (v: { region: string; city: string; district: string }) => void;
  locale?: string;
}) {
  const [regions, setRegions] = useState<Opt[]>([]);
  const [cities, setCities] = useState<Opt[]>([]);
  const [districts, setDistricts] = useState<Opt[]>([]);
  const [region, setRegion] = useState(value?.region || "");
  const [city, setCity] = useState(value?.city || "");
  const [district, setDistrict] = useState(value?.district || "");

  const [allCities, setAllCities] = useState<Opt[]>([]);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || "https://api.nabd.plus"}/api/v1/locations/regions`)
      .then(r => r.json()).then(d => {
        const list: any[] = Array.isArray(d) ? d : d.data || [];
        setRegions(list.map((r:any) => ({ code: r.code, name_ar: r.name_ar || r.code, name_en: r.name_en || r.code })));
      }).catch(()=>{});
    fetch(`${process.env.NEXT_PUBLIC_API_URL || "https://api.nabd.plus"}/api/v1/locations/cities`)
      .then(r => r.json()).then(d => {
        const list: any[] = Array.isArray(d) ? d : d.data || [];
        setAllCities(list.map((c:any) => ({ code: c.code, name_ar: c.name_ar || c.code, name_en: c.name_en || c.code, parent_code: c.parent_code } as any)));
      }).catch(()=>{});
  }, []);

  useEffect(() => {
    if (!region) { setCities([]); setDistricts([]); return; }
    const filtered = allCities.filter((c:any) => (c as any).parent_code === region);
    setCities(filtered);
    if (city && !(filtered as any).some((c:any)=>c.code===city)) { setCity(""); setDistrict(""); }
  }, [region, allCities]);

  useEffect(() => {
    if (!city) { setDistricts([]); return; }
    fetch(`${process.env.NEXT_PUBLIC_API_URL || "https://api.nabd.plus"}/api/v1/locations/districts?city=${encodeURIComponent(city)}`)
      .then(r=>r.json()).then(d=> {
        const list:any[] = Array.isArray(d)?d:d.data||[];
        setDistricts(list.map((x:any)=>({code:x.code, name_ar:x.name_ar||x.code, name_en:x.name_en||x.code})));
      }).catch(()=>{});
  }, [city]);

  const isAr = locale === "ar";
  const t = (ar:string,en:string) => isAr ? ar : en;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3" dir={isAr ? "rtl" : "ltr"}>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-bold">{t("المنطقة","Region")}</span>
        <select value={region} onChange={e=>{setRegion(e.target.value); setCity(""); setDistrict(""); onChange({region:e.target.value, city:"", district:""});}} className="border rounded-lg px-3 py-2 bg-white">
          <option value="">{t("اختر المنطقة","Select region")}</option>
          {regions.map(r=> <option key={r.code} value={r.code}>{isAr?r.name_ar:r.name_en}</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-bold">{t("المدينة","City")}</span>
        <select value={city} onChange={e=>{setCity(e.target.value); onChange({region, city:e.target.value, district});}} className="border rounded-lg px-3 py-2 bg-white" disabled={!region}>
          <option value="">{t("اختر المدينة","Select city")}</option>
          {cities.map(c=> <option key={c.code} value={c.code}>{isAr?c.name_ar:c.name_en}</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-bold">{t("الحي","District")}</span>
        <select value={district} onChange={e=>{setDistrict(e.target.value); onChange({region, city, district:e.target.value});}} className="border rounded-lg px-3 py-2 bg-white" disabled={!city}>
          <option value="">{t("اختر الحي","Select district")}</option>
          {districts.map(d=> <option key={d.code} value={d.code}>{isAr?d.name_ar:d.name_en}</option>)}
        </select>
      </label>
    </div>
  );
}
