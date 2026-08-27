import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { GetServerSideProps } from 'next';
import EmptyIcon from '../../../components/EmptyIcon';

/**
 * M6-SEO1 / ER-2+ER-3: public entity page — /s/:type/:slug
 * SSR from the backend SEO service (GET /seo/meta/:type/:slug) so every
 * entity added to the database automatically gets an indexable page with
 * metadata, JSON-LD, OG/Twitter cards, canonical URL, and an app deep link.
 * Types: medicine | doctor | lab-service | home-care-service | facility
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002';
const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://nabd.plus';

const TYPE_AR: Record<string, { dir: string; label: string }> = {
  medicine: { dir: '/medicines', label: 'الأدوية' },
  doctor: { dir: '/doctors', label: 'الأطباء' },
  'lab-service': { dir: '/lab-services', label: 'التحاليل' },
  'home-care-service': { dir: '/home-care-services', label: 'الرعاية المنزلية' },
  facility: { dir: '/facilities', label: 'المنشآت' },
  article: { dir: '/articles', label: 'المقالات الصحية' },
};

interface Props { meta: any; type: string; }

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="bg-white rounded-2xl border border-slate-200 p-6">
    <h2 className="font-bold text-slate-900 mb-3">{title}</h2>
    {children}
  </section>
);

const ListAr = ({ items }: { items?: string[] }) =>
  items && items.length > 0 ? (
    <ul className="list-disc pr-5 space-y-1 text-sm text-slate-700 leading-6">
      {items.map((x, i) => <li key={i}>{x}</li>)}
    </ul>
  ) : <p className="text-sm text-slate-400">لا توجد بيانات بعد.</p>;

export default function EntityPage({ meta, type }: Props) {
  if (!meta?.found) {
    return (
      <>
        <Head><title>غير موجود | نبض</title><meta name="robots" content="noindex" /></Head>
        <div dir="rtl" className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
          <EmptyIcon name="search" size={44} color="#94A3B8" />
          <h1 className="text-xl font-bold text-slate-800">العنصر غير موجود أو لم يعد متاحًا</h1>
          <Link href="/" className="text-teal-700 font-bold">العودة للرئيسية</Link>
        </div>
      </>
    );
  }

  const e = meta.entity || {};
  const name = e.name_ar || e.name_en || e.full_name || meta.title;
  const t = TYPE_AR[type] || { dir: '/', label: '' };

  return (
    <>
      <Head>
        <title>{meta.title}</title>
        <meta name="description" content={meta.description} />
        <link rel="canonical" href={`${SITE}/s/${type}/${meta.slug}`} />
        <meta property="og:type" content={meta.og?.type || 'website'} />
        <meta property="og:title" content={meta.og?.title || meta.title} />
        <meta property="og:description" content={meta.og?.description || meta.description} />
        <meta property="og:url" content={`${SITE}/s/${type}/${meta.slug}`} />
        {meta.og?.image && <meta property="og:image" content={meta.og.image} />}
        <meta property="og:locale" content="ar_SA" />
        <meta property="og:site_name" content="نبض" />
        <meta name="twitter:card" content={meta.twitter?.card || 'summary'} />
        <meta name="twitter:title" content={meta.twitter?.title || meta.title} />
        <meta name="twitter:description" content={meta.twitter?.description || meta.description} />
        {meta.twitter?.image && <meta name="twitter:image" content={meta.twitter.image} />}
        {meta.structured && (
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(meta.structured) }} />
        )}
      </Head>

      <div dir="rtl" className="min-h-screen bg-slate-50">
        {/* Top bar + breadcrumb */}
        <header className="bg-white border-b border-slate-200">
          <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
            <Link href="/" className="text-xl font-black text-teal-700">نبض</Link>
            <a href={`nabdplus://s/${type}/${meta.slug}`} className="bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold px-4 py-2 rounded-lg transition-colors">
               فتح في التطبيق
            </a>
          </div>
          <nav className="max-w-4xl mx-auto px-6 pb-3 text-xs text-slate-400 flex gap-2">
            <Link href="/" className="hover:text-teal-700">الرئيسية</Link>
            <span>/</span>
            <Link href={t.dir} className="hover:text-teal-700">{t.label}</Link>
            <span>/</span>
            <span className="text-slate-600">{name}</span>
          </nav>
        </header>

        <main className="max-w-4xl mx-auto px-6 py-8 space-y-5">
          {/* Hero card */}
          <section className="bg-white rounded-2xl border border-slate-200 p-6 flex gap-5 items-start">
            {(e.image || e.avatar) && (
              <img src={e.image || e.avatar} alt={name} className="w-24 h-24 rounded-2xl object-cover border border-slate-100 flex-shrink-0" />
            )}
            <div className="flex-1">
              <h1 className="text-2xl font-black text-slate-900">{name}</h1>
              {e.name_en && <div className="text-slate-400 text-sm mt-1" dir="ltr">{e.name_en}</div>}
              <p className="text-slate-600 text-sm mt-3 leading-7">{meta.description}</p>
              <div className="flex flex-wrap gap-2 mt-4">
                {typeof e.price === 'number' && e.price > 0 && (
                  <span className="bg-emerald-50 text-emerald-700 text-xs font-bold px-3 py-1.5 rounded-full">{e.price} ر.س</span>
                )}
                {e.requires_prescription && <span className="bg-red-50 text-red-700 text-xs font-bold px-3 py-1.5 rounded-full">يتطلب وصفة طبية</span>}
                {e.specialty && <span className="bg-indigo-50 text-indigo-700 text-xs font-bold px-3 py-1.5 rounded-full">{e.specialty}</span>}
                {e.category && <span className="bg-slate-100 text-slate-600 text-xs font-bold px-3 py-1.5 rounded-full">{e.category}</span>}
                {e.cold_chain && <span className="bg-sky-50 text-sky-700 text-xs font-bold px-3 py-1.5 rounded-full"> يحتاج تبريد</span>}
              </div>
            </div>
          </section>

          {/* Medicine knowledge base (ER-4) */}
          {type === 'medicine' && (
            <>
              {(e.generic_name || e.active_ingredient || e.strength || e.form) && (
                <Section title="التركيب">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {e.generic_name && <div className="bg-slate-50 rounded-lg p-3"><div className="text-xs text-slate-400">الاسم العلمي</div><div className="font-bold mt-1">{e.generic_name}</div></div>}
                    {e.active_ingredient && <div className="bg-slate-50 rounded-lg p-3"><div className="text-xs text-slate-400">المادة الفعالة</div><div className="font-bold mt-1">{e.active_ingredient}</div></div>}
                    {e.strength && <div className="bg-slate-50 rounded-lg p-3"><div className="text-xs text-slate-400">التركيز</div><div className="font-bold mt-1">{e.strength}</div></div>}
                    {e.form && <div className="bg-slate-50 rounded-lg p-3"><div className="text-xs text-slate-400">الشكل الصيدلاني</div><div className="font-bold mt-1">{e.form}</div></div>}
                  </div>
                </Section>
              )}
              {e.description_ar && <Section title="الوصف"><p className="text-sm text-slate-700 leading-7">{e.description_ar}</p></Section>}
              <Section title="دواعي الاستعمال"><ListAr items={e.indications_ar} /></Section>
              {e.dosage_ar && <Section title="الجرعة وإرشادات الاستخدام"><p className="text-sm text-slate-700 leading-7">{e.dosage_ar}{e.usage_instructions_ar ? `\n${e.usage_instructions_ar}` : ''}</p></Section>}
              <Section title="موانع الاستعمال"><ListAr items={e.contraindications_ar} /></Section>
              <Section title="التحذيرات"><ListAr items={e.warnings_ar} /></Section>
              <Section title="الآثار الجانبية"><ListAr items={e.side_effects_ar} /></Section>
              {e.interactions?.length > 0 && <Section title="التداخلات الدوائية"><ListAr items={e.interactions} /></Section>}
              {(e.pregnancy_info_ar || e.breastfeeding_info_ar) && (
                <Section title="الحمل والرضاعة">
                  {e.pregnancy_info_ar && <p className="text-sm text-slate-700 leading-7 mb-2"><strong>الحمل:</strong> {e.pregnancy_info_ar}</p>}
                  {e.breastfeeding_info_ar && <p className="text-sm text-slate-700 leading-7"><strong>الرضاعة:</strong> {e.breastfeeding_info_ar}</p>}
                </Section>
              )}
              {e.storage_conditions_ar && <Section title="شروط التخزين"><p className="text-sm text-slate-700 leading-7">{e.storage_conditions_ar}</p></Section>}
              {e.alternatives?.length > 0 && (
                <Section title="البدائل">
                  <div className="flex flex-wrap gap-2">
                    {e.alternatives.map((a: string, i: number) => (
                      <span key={i} className="bg-teal-50 text-teal-700 text-xs font-bold px-3 py-1.5 rounded-full">{a}</span>
                    ))}
                  </div>
                </Section>
              )}
              {e.images?.length > 0 && (
                <Section title="صور المنتج">
                  <div className="flex gap-3 overflow-x-auto pb-2">
                    {e.images.map((src: string, i: number) => (
                      <img key={i} src={src} alt={`${name} ${i + 1}`} className="w-40 h-40 rounded-xl object-cover border border-slate-100" loading="lazy" />
                    ))}
                  </div>
                </Section>
              )}
            </>
          )}

          {/* Doctor profile */}
          {type === 'doctor' && (
            <Section title="عن الطبيب">
              <div className="grid grid-cols-2 gap-3 text-sm">
                {e.experience_years && <div className="bg-slate-50 rounded-lg p-3"><div className="text-xs text-slate-400">سنوات الخبرة</div><div className="font-bold mt-1">{e.experience_years}+ سنة</div></div>}
                {e.consultation_fee && <div className="bg-slate-50 rounded-lg p-3"><div className="text-xs text-slate-400">رسوم الاستشارة</div><div className="font-bold mt-1">{e.consultation_fee} ر.س</div></div>}
                {e.city && <div className="bg-slate-50 rounded-lg p-3"><div className="text-xs text-slate-400">المدينة</div><div className="font-bold mt-1">{e.city}</div></div>}
                {e.rating && <div className="bg-slate-50 rounded-lg p-3"><div className="text-xs text-slate-400">التقييم</div><div className="font-bold mt-1"> {e.rating}</div></div>}
              </div>
              {e.bio_ar && <p className="text-sm text-slate-700 leading-7 mt-4">{e.bio_ar}</p>}
            </Section>
          )}

          {/* Services */}
          {(type === 'lab-service' || type === 'home-care-service') && (
            <Section title="تفاصيل الخدمة">
              <div className="grid grid-cols-2 gap-3 text-sm">
                {e.turnaround_hours && <div className="bg-slate-50 rounded-lg p-3"><div className="text-xs text-slate-400">مدة النتيجة</div><div className="font-bold mt-1">{e.turnaround_hours} ساعة</div></div>}
                {e.duration && <div className="bg-slate-50 rounded-lg p-3"><div className="text-xs text-slate-400">مدة الخدمة</div><div className="font-bold mt-1">{e.duration}</div></div>}
              </div>
              {e.description_ar && <p className="text-sm text-slate-700 leading-7 mt-4">{e.description_ar}</p>}
            </Section>
          )}

          {/* Facility */}
          {type === 'facility' && (
            <Section title="عن المنشأة">
              {e.address && <p className="text-sm text-slate-700 leading-7"> {e.address}{e.city ? ` — ${e.city}` : ''}</p>}
              {e.phone && <p className="text-sm text-slate-700 mt-2" dir="ltr"> {e.phone}</p>}
              {e.services?.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {e.services.map((s: string, i: number) => <span key={i} className="bg-slate-100 text-slate-600 text-xs px-3 py-1.5 rounded-full">{s}</span>)}
                </div>
              )}
            </Section>
          )}

          {/* Article (SEO-2) */}
          {type === 'article' && (
            <>
              {e.cover_image && (
                <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                  <img src={e.cover_image} alt={name} className="w-full max-h-80 object-cover" />
                </section>
              )}
              <section className="bg-white rounded-2xl border border-slate-200 p-6">
                {e.category && <span className="bg-teal-50 text-teal-700 text-xs font-bold px-3 py-1.5 rounded-full">{e.category}</span>}
                <article className="text-slate-800 leading-8 mt-4 whitespace-pre-line">{e.body_ar || e.excerpt_ar}</article>
                {(e.author_name || e.published_at) && (
                  <div className="mt-6 pt-4 border-t border-slate-100 text-xs text-slate-400">
                    {e.author_name && <span> {e.author_name}{e.author_title?` — ${e.author_title}`:''}</span>}
                    {e.published_at && <span className="mr-4">{new Date(e.published_at).toLocaleDateString('ar-SA-u-ca-gregory')}</span>}
                  </div>
                )}
              </section>
            </>
          )}

          {/* CTA */}
          <section className="bg-teal-700 rounded-2xl p-6 text-white text-center">
            <h2 className="font-bold text-lg">احجز أو اطلب الآن من التطبيق</h2>
            <p className="text-teal-100 text-sm mt-1">تجربة أسرع مع إشعارات فورية وتتبع حي.</p>
            <a href={`nabdplus://s/${type}/${meta.slug}`} className="inline-block mt-4 bg-white text-teal-700 font-bold px-6 py-2.5 rounded-lg">فتح في تطبيق نبض</a>
          </section>
        </main>
      </div>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ params, res }) => {
  const type = String(params?.type || '');
  const slug = String(params?.slug || '');
  if (!TYPE_AR[type]) return { notFound: true };
  try {
    const r = await fetch(`${API_BASE}/api/v1/seo/meta/${type}/${encodeURIComponent(slug)}`, {
      headers: { Accept: 'application/json' },
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const meta = await r.json();
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    return { props: { meta, type } };
  } catch {
    return { props: { meta: { found: false }, type } };
  }
};
