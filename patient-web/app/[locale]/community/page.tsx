import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { callPatientApi } from "@/lib/api/upstream";

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
  return <main className="main" style={{ padding: "24px 16px", maxWidth: 760, margin: "0 auto" }}>
    <h1>{t("title")}</h1>
    {!response.ok ? <p role="alert">{t("error")}</p> : posts.length === 0 ? <p style={{ opacity: 0.7 }}>{t("empty")}</p> : (
      <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: 10 }}>
        {posts.map((post) => (
          <li key={post.id} style={{ border: "1px solid var(--border, #e2e7ee)", borderRadius: 12, padding: "14px 16px" }}>
            {post.title ? <strong>{post.title}</strong> : null}
            <p style={{ margin: "6px 0 0", whiteSpace: "pre-wrap" }}>{post.body.length > 220 ? `${post.body.slice(0, 220)}…` : post.body}</p>
            <div style={{ fontSize: 13, opacity: 0.7, marginTop: 6 }}>
              {[post.author,
                post.likes !== undefined ? `♥ ${post.likes}` : null,
                post.comments !== undefined ? `💬 ${post.comments}` : null,
                post.createdAt ? new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(post.createdAt)) : null,
              ].filter(Boolean).join(" · ")}
            </div>
          </li>
        ))}
      </ul>
    )}
  </main>;
}
