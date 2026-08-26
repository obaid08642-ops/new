import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { UsersRound } from "lucide-react";
import { authCookieNames } from "@/lib/auth/cookies";
import { callPatientApi } from "@/lib/api/upstream";
import { isLocale } from "@/lib/i18n";
import { CommunityComposer, CommunityPostActions } from "@/components-next/community-composer";

function Card({ children }: { children: React.ReactNode }) {
  return <section className="rounded-xl border border-black/10 bg-white p-4 shadow-sm">{children}</section>;
}

/** Community (parity #31): feed + new post + vote/comment via BFF. */
export default async function CommunityPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const token = (await cookies()).get(authCookieNames.access)?.value;
  if (!token) redirect(`/${locale}/login`);

  const res = await callPatientApi("/community/posts?page=1&limit=20", {}, token);
  if (res.status === 401) redirect(`/${locale}/login`);
  const payload: any = res.ok ? await res.json().catch(() => null) : null;
  const posts = Array.isArray(payload) ? payload : Array.isArray(payload?.items) ? payload.items : Array.isArray(payload?.posts) ? payload.posts : [];

  return (
    <main className="page" dir="rtl">
      <h1 className="text-xl font-bold mb-2"><UsersRound size={18} aria-hidden="true" /> مجتمع نبض+</h1>
      <CommunityComposer />
      <div className="mt-3 grid gap-2">
        {posts.length === 0 ? (
          <Card><p className="text-sm">لا منشورات بعد — كن أول المشاركين.</p></Card>
        ) : posts.slice(0, 20).map((post: any) => (
          <Card key={String(post.id)}>
            <div className="flex justify-between items-start gap-2">
              <strong className="text-sm min-w-0">{String(post.title || "").slice(0, 140)}</strong>
              <CommunityPostActions postId={String(post.id)} score={Number(post.upvotes ?? post.score ?? 0)} />
            </div>
            <p className="text-sm mt-1 whitespace-pre-wrap text-black/80">{String(post.body || post.content || "").slice(0, 500)}</p>
          </Card>
        ))}
      </div>
    </main>
  );
}
