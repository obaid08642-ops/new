"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { PatientAddress } from "./addresses";
import styles from "@/app/[locale]/delivery/address-select/address-select.module.css";

export function DeliveryAddressSelectClient({ addresses, locale }: { addresses: PatientAddress[]; locale: string }) {
  const ar = locale === "ar";
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(() => addresses.find((a) => a.is_default)?.id ?? addresses[0]?.id ?? null);
  function confirm(){ if(!selected) return; try{localStorage.setItem("delivery_address_id",selected);}catch{} router.back(); }
  return (
    <div style={{display:"grid",gap:16}}>
      <Link className={styles.mapLink} href={`/${locale}/map`}>{ar ? "استخدم موقعي الحالي أو حدد على الخريطة" : "Use my current location or pick on the map"}</Link>
      <h2 className={styles.title} style={{fontSize:16}}>{ar ? "العناوين المحفوظة" : "Saved addresses"}</h2>
      {addresses.length===0 ? <p className={styles.state} role="status">{ar ? "لا توجد عناوين محفوظة" : "No saved addresses"}</p> : (
        <ul className={styles.list} role="radiogroup" aria-label={ar ? "عنوان التوصيل" : "Delivery address"} style={{listStyle:"none",padding:0,margin:0}}>
          {addresses.map((a)=>(
            <li key={a.id} className={`${styles.card} ${selected===a.id?styles.cardSelected:""}`}>
              <input type="radio" name="delivery-address" checked={selected===a.id} onChange={()=>setSelected(a.id)} aria-label={a.label||a.id} />
              <label style={{minWidth:0,cursor:"pointer"}} onClick={()=>setSelected(a.id)}>
                <strong className={styles.title}>{a.label || (ar ? "عنوان" : "Address")}{a.is_default ? <span> — {ar ? "افتراضي" : "Default"}</span> : null}</strong>
                <p className={styles.copy}>{[a.line1,a.district,a.city].filter(Boolean).join("، ")}</p>
              </label>
            </li>
          ))}
        </ul>
      )}
      <div className={styles.actions}>
        <Link className={styles.secondaryBtn} href={`/${locale}/map`}>{ar ? "إضافة عنوان جديد على الخريطة" : "Add a new address on the map"}</Link>
        <button type="button" className={styles.primaryBtn} onClick={confirm} disabled={!selected}>{ar ? "تأكيد العنوان" : "Confirm address"}</button>
      </div>
    </div>
  );
}
