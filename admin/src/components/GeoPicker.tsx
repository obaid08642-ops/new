"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "@/utils/api";

type Opt = { code: string; name_ar: string; name_en: string; parent_code?: string };

export function GeoPicker({ value, onChange }: { value?: { region?: string; city?: string; district?: string }; onChange: (v:any)=>void }) {
  const [regions,setRegions]=useState<Opt[]>([]);
  const [allCities,setAllCities]=useState<Opt[]>([]);
  const [cities,setCities]=useState<Opt[]>([]);
  const [districts,setDistricts]=useState<Opt[]>([]);
  const [region,setRegion]=useState(value?.region||"");
  const [city,setCity]=useState(value?.city||"");
  const [district,setDistrict]=useState(value?.district||"");
  useEffect(()=>{ apiFetch('/locations/regions').then((d:any)=>setRegions(Array.isArray(d)?d:[])).catch(()=>{}); apiFetch('/locations/cities').then((d:any)=>setAllCities(Array.isArray(d)?d:[])).catch(()=>{}); },[]);
  useEffect(()=>{ if(!region){setCities([]);return;} setCities(allCities.filter((c:any)=>c.parent_code===region)); },[region, allCities]);
  useEffect(()=>{ if(!city){setDistricts([]);return;} apiFetch(`/locations/districts?city=${encodeURIComponent(city)}`).then((d:any)=>setDistricts(Array.isArray(d)?d:[])).catch(()=>{}); },[city]);
  return (
    <div className="grid grid-cols-3 gap-2">
      <select value={region} onChange={e=>{setRegion(e.target.value); setCity(""); setDistrict(""); onChange({region:e.target.value, city:"", district:""});}} className="border rounded-lg px-3 py-2">
        <option value="">المنطقة</option>{regions.map(r=><option key={r.code} value={r.code}>{r.name_ar}</option>)}
      </select>
      <select value={city} onChange={e=>{setCity(e.target.value); onChange({region, city:e.target.value, district});}} className="border rounded-lg px-3 py-2" disabled={!region}>
        <option value="">المدينة</option>{cities.map(c=><option key={c.code} value={c.code}>{c.name_ar}</option>)}
      </select>
      <select value={district} onChange={e=>{setDistrict(e.target.value); onChange({region, city, district:e.target.value});}} className="border rounded-lg px-3 py-2" disabled={!city}>
        <option value="">الحي</option>{districts.map(d=><option key={d.code} value={d.code}>{d.name_ar}</option>)}
      </select>
    </div>
  );
}
