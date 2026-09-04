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
    <main className="main" style={{ padding: "24px 16px", maxWidth: 800, margin: "0 auto" }}>
      <section
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1.5rem",
          padding: "clamp(1.5rem, 3.5vw, 2.2rem)",
          border: "1px solid rgba(8,127,140,.22)",
          borderRadius: "var(--radius-xl)",
          background: "linear-gradient(135deg, rgba(231,247,247,.95), #FFFFFF 65%, rgba(95,217,179,.1))",
          boxShadow: "var(--shadow-md)",
          marginBottom: "1.5rem",
        }}
      >
        <div>
          <p style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem", margin: 0, color: "#087F8C", fontSize: "0.82rem", fontWeight: 760 }}>
            <UsersRound size={15} aria-hidden="true" />
            {isAr ? "مجتمع نبض بلس الطبي" : "Nabd Plus Health Community"}
          </p>
          <h1 style={{ margin: "0.4rem 0 0", color: "var(--ink)", fontSize: "clamp(1.8rem, 3.2vw, 2.4rem)", letterSpacing: "-0.035em" }}>
            {t("title")}
          </h1>
          <p style={{ margin: "0.5rem 0 0", color: "var(--muted)", fontSize: "0.94rem", lineHeight: 1.6 }}>
            {isAr
              ? "مساحة آمنة لمشاركة التجارب الصحية، الاستفسارات، وقصص التعافي مع مجتمع المرضى والأطباء."
              : "A safe space to share patient journeys, health questions, and recovery stories."}
          </p>
        </div>
        <div style={{ display: "grid", placeItems: "center", flex: "0 0 auto", width: "5rem", height: "5rem", border: "1px solid rgba(8,127,140,.22)", borderRadius: "var(--radius-xl)", background: "#FFFFFF", boxShadow: "var(--shadow-md)" }}>
          <VectorFamily size={80} />
        </div>
      </section>

      {!response.ok ? (
        <p role="alert" style={{ color: "#DC2626", textAlign: "center", padding: "2rem" }}>{t("error")}</p>
      ) : posts.length === 0 ? (
        <div style={{ border: "1px dashed var(--line)", borderRadius: "var(--radius-xl)", padding: "3rem 1.5rem", textAlign: "center", color: "var(--muted)" }}>
          <UsersRound size={36} color="var(--muted)" style={{ margin: "0 auto 12px" }} />
          <p style={{ margin: 0 }}>{t("empty")}</p>
        </div>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: 14 }}>
          {posts.map((post) => (
            <li
              key={post.id}
              style={{
                border: "1px solid var(--line)",
                borderRadius: "var(--radius-xl)",
                padding: "18px 22px",
                background: "#FFFFFF",
                boxShadow: "var(--shadow-sm)",
              }}
            >
              {post.title ? (
                <strong style={{ display: "block", color: "var(--ink)", fontSize: "1.1rem", marginBottom: 6 }}>
                  {post.title}
                </strong>
              ) : null}
              <p style={{ margin: 0, whiteSpace: "pre-wrap", color: "var(--ink)", lineHeight: 1.65, fontSize: "0.95rem" }}>
                {post.body.length > 220 ? `${post.body.slice(0, 220)}…` : post.body}
              </p>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 16,
                  fontSize: 13,
                  color: "var(--muted)",
                  marginTop: 14,
                  paddingTop: 12,
                  borderTop: "1px solid rgba(229,232,238,0.7)",
                }}
              >
                {post.author ? (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                    <User size={14} aria-hidden="true" />
                    {post.author}
                  </span>
                ) : null}
                {post.likes !== undefined ? (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "#E11D48" }}>
                    <Heart size={14} fill="#E11D48" aria-hidden="true" />
                    {post.likes}
                  </span>
                ) : null}
                {post.comments !== undefined ? (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "var(--brand-deep)" }}>
                    <MessageCircle size={14} aria-hidden="true" />
                    {post.comments}
                  </span>
                ) : null}
                {post.createdAt ? (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
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
