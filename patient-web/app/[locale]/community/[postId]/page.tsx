import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Heart, MessageCircle, User } from "lucide-react";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { callPatientApi } from "@/lib/api/upstream";
import { CommunityCommentForm } from "@/components-next/community-comment-form";

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
    <main className="main">
      <Link href={`/${locale}/community`}>{ar ? "المجتمع" : "Community"}</Link>
      <article>
        {title ? <h1>{title}</h1> : null}
        <p style={{ whiteSpace: "pre-wrap" }}>{body}</p>
        {author ? (
          <p style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
            <User size={14} aria-hidden="true" />
            {author}
          </p>
        ) : null}
      </article>
      <section aria-label={ar ? "التعليقات" : "Comments"}>
        <h2>
          <MessageCircle size={15} aria-hidden="true" /> {ar ? "التعليقات" : "Comments"}
        </h2>
        {comments.length === 0 ? (
          <p>{ar ? "لا توجد تعليقات بعد." : "No comments yet."}</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: 12 }}>
            {comments.map((c) => (
              <li key={c.id} style={{ border: "1px solid var(--line)", borderRadius: 12, padding: "12px 16px" }}>
                <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{c.body}</p>
                {c.author ? <small>{c.author}</small> : null}
              </li>
            ))}
          </ul>
        )}
        <CommunityCommentForm postId={postId} locale={locale} />
      </section>
      <p style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "#E11D48" }}>
        <Heart size={14} fill="#E11D48" aria-hidden="true" />
        {ar ? "الإعجابات" : "Likes"}
      </p>
    </main>
  );
}
