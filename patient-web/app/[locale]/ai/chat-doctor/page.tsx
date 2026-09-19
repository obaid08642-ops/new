import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { callPatientApi } from "@/lib/api/upstream";
import { VectorAI } from "@/components-next/vector-illustrations";
import { ChatDoctorClient } from "@/components-next/chat-doctor-client";
import styles from "../triage.module.css";

type Props = { params: Promise<{ locale: string }> };

function toInitialMessages(payload: unknown): { id: string; role: "user" | "assistant"; content: string }[] {
  if (!payload || typeof payload !== "object") return [];
  const root = payload as Record<string, unknown>;
  const list: unknown[] = Array.isArray(root.messages)
    ? (root.messages as unknown[])
    : Array.isArray(root.data)
      ? (root.data as unknown[])
      : Array.isArray(root.items)
        ? (root.items as unknown[])
        : [];
  return list.slice(-10).flatMap((raw) => {
    if (!raw || typeof raw !== "object") return [];
    const r = raw as Record<string, unknown>;
    const content = typeof r.content === "string" ? r.content : typeof r.text === "string" ? r.text : typeof r.message === "string" ? r.message : null;
    if (!content) return [];
    const role = r.sender_role === "user" || r.role === "user" ? "user" : "assistant";
    const id = typeof r.id === "string" ? r.id : crypto.randomUUID?.() ?? String(Math.random());
    return [{ id, role, content: content.slice(0, 800) }];
  });
}

export default async function AiChatDoctorPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const token = await requirePatientAccess(locale);
  const t = await getTranslations("AiTriage");

  let initialMessages: { id: string; role: "user" | "assistant"; content: string }[] = [];
  // Backend binding: callPatientApi — no mock. Hydrate from recent chat threads if available; otherwise empty (chat starts fresh).
  try {
    const res = await callPatientApi("/chat/threads", {}, token);
    if (res.ok) {
      const payload = await res.json().catch(() => null);
      initialMessages = toInitialMessages(payload);
    }
  } catch {
    initialMessages = [];
  }

  return (
    <main className={`main ${styles.page}`} style={{ background: "#FDFDFC" }}>
      <section className={styles.hero} style={{ background: "rgba(255,255,255,.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", borderColor: "#E8EDEE", borderRadius: 20 }}>
        <div style={{ minWidth: 0 }}>
          <p className={styles.eyebrow} style={{ color: "#1E332E", overflowWrap: "anywhere" }}>
            {locale === "ar" ? "الطبيب الذكي" : "AI Doctor"}
          </p>
          <h1
            style={{
              color: "#1E332E",
              overflowWrap: "anywhere",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {locale === "ar" ? "تحدث مع الطبيب الذكي" : "Chat with AI Doctor"}
          </h1>
          <p className={styles.subtitle} style={{ color: "#6B7C6E", overflowWrap: "anywhere" }}>
            {t("subtitle")}
          </p>
        </div>
        <span className={styles.heroIcon} style={{ width: 48, height: 48, minWidth: 48, minHeight: 48, border: "1px solid #E8EDEE", borderRadius: 16, background: "rgba(95,217,179,.12)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <VectorAI size={48} aria-hidden="true" />
        </span>
      </section>

      <div className={styles.card} style={{ backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", borderColor: "#E8EDEE", borderRadius: 20, background: "rgba(255,255,255,0.76)" }}>
        <ChatDoctorClient locale={locale} initialMessages={initialMessages} />
      </div>
    </main>
  );
}
