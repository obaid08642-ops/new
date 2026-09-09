"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mic } from "lucide-react";

const ROUTES: Array<{ href: string; keywords: string[] }> = [
  { href: "consultations/doctors", keywords: ["طبيب", "دكتور", "استشارة", "doctor", "consult"] },
  { href: "medicines", keywords: ["دواء", "صيدلية", "علاج", "medicine", "pharmacy", "drug"] },
  { href: "diagnostics/labs", keywords: ["تحليل", "مختبر", "أشعة", "lab", "test", "radiology"] },
  { href: "nursing/catalog", keywords: ["تمريض", "ممرض", "منزلي", "nurse", "nursing", "home"] },
  { href: "appointments", keywords: ["موعد", "مواعيد", "حجز", "appointment", "booking"] },
  { href: "ai", keywords: ["ذكاء", "أعراض", "ai", "symptom", "triage"] },
  { href: "emergency", keywords: ["طوارئ", "إسعاف", "emergency", "sos", "ambulance"] },
];

export function VoiceCommandButton({ locale }: { locale: string }) {
  const router = useRouter();
  const [listening, setListening] = useState(false);
  const [heard, setHeard] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const ar = locale === "ar";

  function start() {
    setError(null);
    setHeard(null);
    const SR = (window as unknown as { webkitSpeechRecognition?: new () => any; SpeechRecognition?: new () => any })
      .SpeechRecognition || (window as unknown as { webkitSpeechRecognition?: new () => any }).webkitSpeechRecognition;
    if (!SR) {
      setError(ar ? "المتصفح لا يدعم الأوامر الصوتية" : "Browser does not support voice commands");
      return;
    }
    const rec = new SR();
    rec.lang = ar ? "ar-SA" : "en-US";
    rec.interimResults = false;
    rec.maxAlternatives = 3;
    setListening(true);
    rec.onresult = (event: any) => {
      const transcript = String(event.results?.[0]?.[0]?.transcript || "").trim();
      setHeard(transcript || null);
      const hit = ROUTES.find((r) => r.keywords.some((k) => transcript.toLowerCase().includes(k.toLowerCase())));
      setListening(false);
      if (hit) router.push(`/${locale}/${hit.href}`);
    };
    rec.onerror = () => {
      setListening(false);
      setError(ar ? "تعذر سماعك — حاول مجدداً" : "Could not hear you — try again");
    };
    rec.onend = () => setListening(false);
    try {
      rec.start();
    } catch {
      setListening(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 8, justifyItems: "center" }}>
      <button type="button" onClick={start} disabled={listening} aria-label={ar ? "تحدث بالأمر" : "Speak command"}>
        <Mic size={20} aria-hidden="true" /> {listening ? (ar ? "أستمع..." : "Listening...") : (ar ? "تحدث بالأمر" : "Speak command")}
      </button>
      {heard ? <p role="status">{ar ? "سمعت:" : "Heard:"} {heard}</p> : null}
      {error ? <p role="alert">{error}</p> : null}
    </div>
  );
}
