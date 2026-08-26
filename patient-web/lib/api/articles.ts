import { z } from "zod";

const articleSchema = z.object({
  id: z.string().max(120).optional(), slug: z.string().regex(/^[A-Za-z0-9_-]{1,160}$/), title_ar: z.string().max(300).optional(), title_en: z.string().max(300).optional(),
  excerpt_ar: z.string().max(1000).optional(), excerpt_en: z.string().max(1000).optional(), category: z.string().max(120).optional(), cover_image: z.string().url().max(2000).optional(), author_name: z.string().max(160).optional(), author_title: z.string().max(160).optional(), published_at: z.string().max(80).optional(),
}).passthrough();
export type ArticleSummary = { id?: string; slug: string; titleAr?: string; titleEn?: string; excerptAr?: string; excerptEn?: string; category?: string; coverImage?: string; authorName?: string; authorTitle?: string; publishedAt?: string };
function root(payload: unknown): unknown { if (Array.isArray(payload)) return payload; if (!payload || typeof payload !== "object") return []; const r=payload as Record<string,unknown>; return r.data ?? r.articles ?? []; }
function mapArticle(value: unknown): ArticleSummary | null { const parsed=articleSchema.safeParse(value); if (!parsed.success) return null; const a=parsed.data; return { id:a.id, slug:a.slug, titleAr:a.title_ar, titleEn:a.title_en, excerptAr:a.excerpt_ar, excerptEn:a.excerpt_en, category:a.category, coverImage:a.cover_image, authorName:a.author_name, authorTitle:a.author_title, publishedAt:a.published_at }; }
export function parseArticleList(payload: unknown): ArticleSummary[] { const list=root(payload); return Array.isArray(list) ? list.flatMap((value)=>{const a=mapArticle(value); return a?[a]:[]}) : []; }
export function parseArticle(payload: unknown): ArticleSummary | null { const list=parseArticleList(payload); return list[0] ?? null; }
export function articleSlug(value: string) { return /^[A-Za-z0-9_-]{1,160}$/.test(value); }
export function parseArticleCategories(payload: unknown): string[] { const list: unknown[] = Array.isArray(payload) ? payload : payload && typeof payload === "object" && Array.isArray((payload as Record<string, unknown>).data) ? (payload as Record<string, unknown>).data as unknown[] : []; return list.filter((value): value is string => typeof value === "string" && value.trim().length > 0 && value.length <= 120).slice(0, 100); }
export function articleQuery(input: { q?: string; category?: string; page?: number }) { const params=new URLSearchParams({ limit:"20", page:String(Math.max(1, Math.min(1000, Math.floor(input.page ?? 1)))) }); const q=input.q?.trim().slice(0,80); const category=input.category?.trim().slice(0,120); if(q) params.set("q", q); if(category) params.set("category", category); return `/articles?${params.toString()}`; }
