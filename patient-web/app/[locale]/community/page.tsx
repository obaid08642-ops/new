import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { callPatientApi } from "@/lib/api/upstream";
import { VectorFamily } from "@/components-next/vector-illustrations";
import { Calendar, Heart, MessageCircle, User, UsersRound } from "lucide-react";

type Props = { params: Promise<{ locale: string }> };

type Post = { id: string; title?: string; body: string; author?: string; likes?: number; comments?: number; createdAt?: string };

function extractPosts(payload: unknown): Post[] {
  const root = payload && typeof payload === "object" && !Array.isArray(payload) ? payload as Record<string, unknown> : null;
  const values = Array.isArray(payload) ? payload : [root?.data, root?.posts, root?.items].find(Array.isArray);
  if (!Array.isArray(values)) return [];
  return values.flatMap((value) => {
    const r = value && typeof value === "object" ? value as Record<string, unknown> : null;
    if (!r || !r.id) return [];
    const body = typeof r.body === "string" ? r.body : typeof r.content === "string" ? r.content : "";
    if (!body && !r.title) return [];
    return [{
      id: String(r.id),
      title: typeof r.title === "string" ? r.title : undefined,
      body,
      author: typeof r.author_name === "string" ? r.author_name : typeof r.author === "string" ? r.author : undefined,
      likes: Number(r.likes_count ?? r.likes ?? NaN) || undefined,
      comments: Number(r.comments_count ?? r.comments ?? NaN) || undefined,
      createdAt: typeof r.createdAt === "string" ? r.createdAt : undefined,
    }];
  });
}

export default async function CommunityPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const token = await requirePatientAccess(locale);
  const t = await getTranslations("Community");
  const response = await callPatientApi("/community/posts?page=1&limit=20", {}, token);
  const posts = response.ok ? extractPosts(await response.json().catch(() => null)) : [];
  const isAr = locale === "ar";

  return (
    <main className="main" style={{ padding: "32px 16px 80px", maxWidth: 860, margin: "0 auto", background: "#FDFDFC" }}>
      <section
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          padding: "clamp(28px, 4vw, 36px)",
          border: "1px solid #E8EDEE",
          borderRadius: 20,
          background: "rgba(255,255,255,0.76)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          boxShadow: "0 10px 28px rgba(16,24,40,.07)",
          marginBottom: 24,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <p style={{ display: "inline-flex", alignItems: "center", gap: 8, margin: 0, color: "#1E332E", fontSize: 12, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", background: "rgba(95,217,179,0.14)", padding: "5px 12px", borderRadius: 999, overflowWrap: "anywhere" }}>
            <UsersRound size={15} aria-hidden="true" />
            {isAr ? "مجتمع نبض بلس الطبي" : "Nabd Plus Health Community"}
          </p>
          <h1 style={{ margin: "0.4rem 0 0", color: "#1E332E", fontSize: "clamp(1.8rem, 3.2vw, 2.4rem)", letterSpacing: "-0.035em", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {t("title")}
          </h1>
          <p style={{ margin: "0.5rem 0 0", color: "#6B7C6E", fontSize: "0.94rem", lineHeight: 1.6, overflowWrap: "anywhere" }}>
            {isAr
              ? "مساحة آمنة لمشاركة التجارب الصحية، الاستفسارات، وقصص التعافي مع مجتمع المرضى والأطباء."
              : "A safe space to share patient journeys, health questions, and recovery stories."}
          </p>
        </div>
        <div style={{ display: "grid", placeItems: "center", flex: "0 0 auto", width: 76, height: 76, border: "1px solid #E8EDEE", borderRadius: 20, background: "rgba(95,217,179,0.12)", boxShadow: "0 10px 24px rgba(30,51,46,0.06)" }}>
          <VectorFamily size={48} aria-hidden="true" />
        </div>
      </section>

      {!response.ok ? (
        <p role="alert" style={{ color: "#DC2626", textAlign: "center", padding: 32, border: "1px solid #E8EDEE", borderRadius: 20, background: "rgba(255,255,255,0.76)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", overflowWrap: "anywhere" }}>{t("error")}</p>
      ) : posts.length === 0 ? (
        <div style={{ border: "1px dashed #E8EDEE", borderRadius: 20, padding: "48px 24px", textAlign: "center", color: "#6B7C6E", background: "rgba(255,255,255,0.76)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" }}>
          <UsersRound size={36} color="#6B7C6E" style={{ margin: "0 auto 12px" }} />
          <p style={{ margin: 0, overflowWrap: "anywhere" }}>{t("empty")}</p>
        </div>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: 16 }}>
          {posts.map((post) => (
            <li
              key={post.id}
              style={{
                border: "1px solid #E8EDEE",
                borderRadius: 20,
                padding: 16,
                background: "rgba(255,255,255,0.76)",
                backdropFilter: "blur(16px)",
                WebkitBackdropFilter: "blur(16px)",
                boxShadow: "0 8px 22px rgba(30,51,46,.06)",
              }}
            >
              {post.title ? (
                <strong style={{ display: "-webkit-box", color: "#1E332E", fontSize: "1.1rem", marginBottom: 8, overflowWrap: "anywhere", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as React.CSSProperties}>
                  <Link href={`/${locale}/community/${encodeURIComponent(post.id)}`} style={{ color: "#1E332E", textDecoration: "none" }}>{post.title}</Link>
                </strong>
              ) : null}
              <p style={{ margin: 0, whiteSpace: "pre-wrap", color: "#1E332E", lineHeight: 1.65, fontSize: "0.95rem", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                {post.body.length > 220 ? `${post.body.slice(0, 220)}…` : post.body}
              </p>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 16,
                  fontSize: 13,
                  color: "#6B7C6E",
                  marginTop: 16,
                  paddingTop: 16,
                  borderTop: "1px solid #E8EDEE",
                }}
              >
                {post.author ? (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 8, overflowWrap: "anywhere" }}>
                    <User size={14} aria-hidden="true" />
                    {post.author}
                  </span>
                ) : null}
                {post.likes !== undefined ? (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "#E11D48" }}>
                    <Heart size={14} fill="#E11D48" aria-hidden="true" />
                    {post.likes}
                  </span>
                ) : null}
                {post.comments !== undefined ? (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "#1E332E" }}>
                    <MessageCircle size={14} aria-hidden="true" />
                    {post.comments}
                  </span>
                ) : null}
                {post.createdAt ? (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                    <Calendar size={13} aria-hidden="true" />
                    {new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(post.createdAt))}
                  </span>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
