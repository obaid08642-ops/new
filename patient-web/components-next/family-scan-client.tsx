"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function FamilyScanClient({ locale }: { locale: string }) {
  const ar = locale === "ar";
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit() {
    const trimmed = code.trim();
    if (!trimmed) { setError(ar ? "أدخل رمز الدعوة" : "Enter the invite code"); return; }
    router.push(`/${locale}/family/join?code=${encodeURIComponent(trimmed)}`);
  }

  return (
    <div>
      <p>{ar ? "امسح رمز QR للدعوة العائلية بكاميرا هاتفك، أو أدخل الرمز يدوياً." : "Scan the family invite QR with your phone camera, or enter the code manually."}</p>
      <form onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <label>
          <span>{ar ? "رمز الدعوة" : "Invite code"}</span>
          <input value={code} onChange={(e) => setCode(e.target.value)} autoComplete="off"
            placeholder={ar ? "الصق الرمز أو رابطه هنا" : "Paste the code or its link here"} />
        </label>
        <button type="submit">{ar ? "متابعة للانضمام" : "Continue to join"}</button>
      </form>
      {error ? <p role="alert">{error}</p> : null}
    </div>
  );
}
