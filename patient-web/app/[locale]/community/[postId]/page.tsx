import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Heart, MessageCircle, User } from "lucide-react";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { callPatientApi } from "@/lib/api/upstream";
import { CommunityCommentForm } from "@/components-next/community-comment-form";
import { VectorFamily } from "@/components-next/vector-illustrations";

type Props = { params: Promise<{ locale: string; postId: string }> };

type Comment = { id: string; body: string; author?: string; createdAt?: string };

function extractComments(payload: unknown): Comment[] {
  const root = payload && typeof payload === "object" && !Array.isArray(payload) ? (payload as Record<string, unknown>) : null;
  const values = Array.isArray(payload)
    ? payload
    : [root?.data, root?.comments, root?.items].find(Array.isArray);
  if (!Array.isArray(values)) return [];
  return values.flatMap((value) => {
    const r = value && typeof value === "object" ? (value as Record<string, unknown>) : null;
    if (!r || !r.id) return [];
    const body = typeof r.body === "string" ? r.body : typeof r.content === "string" ? r.content : "";
    if (!body) return [];
    return [{
      id: String(r.id),
      body,
      author: typeof r.author_name === "string" ? r.author_name : typeof r.author === "string" ? r.author : undefined,
      createdAt: typeof r.createdAt === "string" ? r.createdAt : undefined,
    }];
  });
}

export default async function CommunityPostPage({ params }: Props) {
  const { locale, postId } = await params;
  if (!isLocale(locale) || !/^[A-Za-z0-9_-]{1,128}$/.test(postId)) notFound();
  setRequestLocale(locale);
  await getTranslations("Community");
  const ar = locale === "ar";
  const token = await requirePatientAccess(locale);
  const response = await callPatientApi(`/community/posts/${encodeURIComponent(postId)}`, {}, token);
  if (response.status === 401) redirect(`/${locale}/login`);
  if (response.status === 403 || response.status === 404) notFound();
  if (!response.ok) notFound();
  const raw = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  const data = (raw?.data ?? raw) as Record<string, unknown> | null;
  if (!data || typeof data !== "object") notFound();
  const title = typeof data.title === "string" ? data.title : undefined;
  const body = typeof data.body === "string" ? data.body : typeof data.content === "string" ? data.content : "";
  const author = typeof data.author_name === "string" ? data.author_name : typeof data.author === "string" ? data.author : undefined;
  const comments = extractComments((data as Record<string, unknown>).comments ?? data);

  return (
    <main className="main" style={{ padding: "32px 16px 80px", maxWidth: 860, margin: "0 auto", background: "#FDFDFC", display: "grid", gap: 24 }}>
      <Link href={`/${locale}/community`} style={{ color: "#1E332E", fontWeight: 700, textDecoration: "none", overflowWrap: "anywhere", display: "inline-flex", alignItems: "center", gap: 8 }}>
        {ar ? "المجتمع" : "Community"}
      </Link>

      <section style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "clamp(28px, 4vw, 36px)", border: "1px solid #E8EDEE", borderRadius: 20, background: "rgba(255,255,255,0.76)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", boxShadow: "0 10px 28px rgba(16,24,40,.07)" }}>
        <div style={{ minWidth: 0 }}>
          <p style={{ display: "inline-flex", alignItems: "center", gap: 8, margin: 0, color: "#1E332E", fontSize: 12, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", background: "rgba(95,217,179,0.14)", padding: "5px 12px", borderRadius: 999, overflowWrap: "anywhere" }}>{ar ? "منشور المجتمع" : "Community post"}</p>
          {title ? <h1 style={{ margin: "8px 0 0", color: "#1E332E", fontSize: "clamp(22px, 3.2vw, 28px)", fontWeight: 850, letterSpacing: "-0.03em", lineHeight: 1.2, overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{title}</h1> : null}
          {author ? (
            <p style={{ display: "inline-flex", alignItems: "center", gap: 8, margin: "8px 0 0", color: "#6B7C6E", fontSize: 13, overflowWrap: "anywhere" }}>
              <User size={14} aria-hidden="true" />
              {author}
            </p>
          ) : null}
        </div>
        <span style={{ display: "grid", placeItems: "center", flex: "0 0 auto", width: 76, height: 76, border: "1px solid #E8EDEE", borderRadius: 20, background: "rgba(95,217,179,0.12)", boxShadow: "0 10px 24px rgba(30,51,46,0.06)" }}><VectorFamily size={48} aria-hidden="true" /></span>
      </section>

      <article style={{ padding: 24, border: "1px solid #E8EDEE", borderRadius: 20, background: "rgba(255,255,255,0.76)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", boxShadow: "0 8px 22px rgba(30,51,46,.06)", display: "grid", gap: 16 }}>
        <p style={{ margin: 0, whiteSpace: "pre-wrap", color: "#1E332E", lineHeight: 1.7, fontSize: "0.95rem", overflowWrap: "anywhere" }}>{body}</p>
      </article>

      <section aria-label={ar ? "التعليقات" : "Comments"} style={{ padding: 24, border: "1px solid #E8EDEE", borderRadius: 20, background: "rgba(255,255,255,0.76)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", boxShadow: "0 8px 22px rgba(30,51,46,.06)", display: "grid", gap: 16 }}>
        <h2 style={{ margin: 0, color: "#1E332E", fontSize: 16, fontWeight: 800, display: "inline-flex", alignItems: "center", gap: 8, overflowWrap: "anywhere" }}>
          <MessageCircle size={15} aria-hidden="true" /> {ar ? "التعليقات" : "Comments"}
        </h2>
        {comments.length === 0 ? (
          <p style={{ margin: 0, color: "#6B7C6E", padding: 16, border: "1px dashed #E8EDEE", borderRadius: 16, textAlign: "center", overflowWrap: "anywhere" }}>{ar ? "لا توجد تعليقات بعد." : "No comments yet."}</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 16 }}>
            {comments.map((c) => (
              <li key={c.id} style={{ border: "1px solid #E8EDEE", borderRadius: 16, padding: 16, background: "rgba(255,255,255,0.9)", display: "grid", gap: 8 }}>
                <p style={{ margin: 0, whiteSpace: "pre-wrap", color: "#1E332E", lineHeight: 1.65, overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{c.body}</p>
                {c.author ? <small style={{ color: "#6B7C6E", overflowWrap: "anywhere" }}>{c.author}</small> : null}
              </li>
            ))}
          </ul>
        )}
        <div style={{ paddingTop: 16, borderTop: "1px solid #E8EDEE" }}>
          <CommunityCommentForm postId={postId} locale={locale} />
        </div>
      </section>

      <p style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "#E11D48", margin: 0, padding: "8px 16px", border: "1px solid #E8EDEE", borderRadius: 20, background: "rgba(255,255,255,0.76)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", width: "fit-content", overflowWrap: "anywhere" }}>
        <Heart size={14} fill="#E11D48" aria-hidden="true" />
        {ar ? "الإعجابات" : "Likes"}
      </p>
    </main>
  );
}
