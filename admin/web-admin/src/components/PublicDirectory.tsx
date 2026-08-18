import { adminApiBase } from '@/utils/api';
import React, { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';

/** M6-SEO1: shared public directory renderer (SSR lists + search + internal links). */

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://nabd.plus';

// Mirror of backend common/slug.util.ts (keep in sync)
const AR_MAP: Record<string, string> = {
  'ا': 'a', 'أ': 'a', 'إ': 'i', 'آ': 'a', 'ب': 'b', 'ت': 't', 'ث': 'th', 'ج': 'j', 'ح': 'h', 'خ': 'kh',
  'د': 'd', 'ذ': 'dh', 'ر': 'r', 'ز': 'z', 'س': 's', 'ش': 'sh', 'ص': 's', 'ض': 'd', 'ط': 't', 'ظ': 'z',
  'ع': 'a', 'غ': 'gh', 'ف': 'f', 'ق': 'q', 'ك': 'k', 'ل': 'l', 'م': 'm', 'ن': 'n', 'ه': 'h', 'و': 'w',
  'ي': 'y', 'ى': 'a', 'ئ': 'i', 'ء': '', 'ؤ': 'u', 'ة': 'a', 'ـ': '-',
};
export function slugify(input: string, maxLen = 60): string {
  if (!input) return 'item';
  let out = '';
  for (const ch of input.toLowerCase()) {
    if (AR_MAP[ch] !== undefined) out += AR_MAP[ch];
    else if (/[a-z0-9]/.test(ch)) out += ch;
    else out += '-';
  }
  out = out.replace(/-+/g, '-').replace(/^-+|-+$/g, '').slice(0, maxLen);
  return out || 'item';
}
export function buildSlug(name: string, id: string): string {
  const sfx = (id || '').replace(/-/g, '').slice(0, 6).toLowerCase();
  return `${slugify(name)}-${sfx}`;
}

const CANONICAL_PATH: Record<string, string> = {
  medicine: 'medicines',
  doctor: 'doctors',
  facility: 'facilities',
  'lab-service': 'lab-services',
  'home-care-service': 'home-care-services',
  article: 'articles',
};

export interface DirectoryConfig {
  type: string;          // seo entity type for /s/ links
  title: string;         // H1
  description: string;   // meta description
  icon: string;
  itemLine?: (e: any) => string; // secondary line under the name
  itemBadge?: (e: any) => string | null;
}

export function PublicDirectory({ config, items }: { config: DirectoryConfig; items: any[] }) {
  const [q, setQ] = useState('');
  const filtered = q.trim()
    ? items.filter((e) => JSON.stringify([
      e.name_ar, e.name_en, e.full_name, e.specialty, e.city, e.category,
      e.title_ar, e.title_en, e.excerpt_ar, e.excerpt_en, e.tags,
    ]).toLowerCase().includes(q.trim().toLowerCase()))
    : items;

  return (
    <>
      <Head>
        <title>{config.title} | نبض</title>
        <meta name="description" content={config.description} />
        <link rel="canonical" href={`${SITE}/${CANONICAL_PATH[config.type] || config.type}`} />
        <meta property="og:title" content={`${config.title} | نبض`} />
        <meta property="og:description" content={config.description} />
        <meta property="og:type" content="website" />
        <meta property="og:locale" content="ar_SA" />
      </Head>

      <div dir="rtl" className="min-h-screen bg-slate-50">
        <header className="bg-white border-b border-slate-200">
          <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
            <Link href="/" className="text-xl font-black text-teal-700">نبض</Link>
            <Link href="/" className="bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold px-4 py-2 rounded-lg"> التطبيق</Link>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-6 py-8">
          <h1 className="text-3xl font-black text-slate-900">{config.icon} {config.title}</h1>
          <p className="text-slate-500 mt-2">{config.description}</p>

          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={`ابحث في ${config.title}…`}
            className="mt-6 w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-teal-500"
          />

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((e, i) => {
              const name = e.name_ar || e.name_en || e.full_name || e.title_ar || e.title_en || 'عنصر';
              const slug = e.slug || buildSlug(name, e.id || e._id || String(i));
              const badge = config.itemBadge?.(e);
              return (
                <Link
                  key={e.id || e._id || i}
                  href={`/s/${config.type}/${slug}`}
                  className="bg-white rounded-2xl border border-slate-200 p-5 hover:border-teal-400 hover:shadow-sm transition-all group"
                >
                  <div className="flex items-start gap-3">
                    {(e.image || e.avatar) && <img src={e.image || e.avatar} alt={name} className="w-12 h-12 rounded-xl object-cover flex-shrink-0" loading="lazy" />}
                    <div className="flex-1 min-w-0">
                      <h2 className="font-bold text-slate-900 group-hover:text-teal-700 truncate">{name}</h2>
                      {config.itemLine && <p className="text-xs text-slate-500 mt-1 line-clamp-2">{config.itemLine(e)}</p>}
                      {badge && <span className="inline-block mt-2 bg-slate-100 text-slate-600 text-[11px] px-2 py-0.5 rounded-full">{badge}</span>}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
          {filtered.length === 0 && <p className="text-center text-slate-400 py-12">لا نتائج مطابقة.</p>}
        </main>
      </div>
    </>
  );
}

export async function fetchDirectory(endpoint: string): Promise<any[]> {
  const API_BASE = adminApiBase();
  try {
    const r = await fetch(`${API_BASE}/api/v1${endpoint}`, { headers: { Accept: 'application/json' } });
    if (!r.ok) return [];
    const data = await r.json();
    return Array.isArray(data) ? data : data?.data || data?.items || [];
  } catch {
    return [];
  }
}
