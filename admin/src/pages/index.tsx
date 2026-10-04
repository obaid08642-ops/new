import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import EmptyIcon from '../components/EmptyIcon';

/**
 * M6-SEO1 / ER-2: public landing page — was an admin-only redirect (M0).
 * Now a crawlable entry point with internal links to every entity directory,
 * deep-link CTA to the mobile apps, and full SEO/OG metadata.
 */

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://nabd.plus';

const SECTIONS = [
  { href:'/doctors', icon:'', title:'الأطباء', desc:'استشارات حضورية وأونلاين مع أطباء مرخصين في كل التخصصات' },
  { href: '/medicines', icon: '', title: 'الأدوية والمنتجات', desc: 'قاعدة معرفة دوائية شاملة مع البدائل والتداخلات والأسعار' },
  { href: '/facilities', icon: '', title: 'المنشآت الصحية', desc: 'مستشفيات وعيادات وصيدليات ومعامل ومراكز أشعة قريبة منك' },
  { href: '/lab-services', icon: '', title: 'التحاليل المخبرية', desc: 'احجز تحاليلك من البيت أو المختبر وتابع نتائجك رقميًا' },
  { href: '/home-care-services', icon: '', title: 'الرعاية المنزلية', desc: 'تمريض وعلاج طبيعي ورعاية منزلية حتى باب منزلك' },
  { href: '/articles', icon: '', title: 'المقالات الصحية', desc: 'محتوى صحي موثوق: وقاية وتغذية وأمومة وصحة نفسية' },
];

export default function Home() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'MedicalOrganization',
    name: 'نبض — Nabd',
    url: SITE,
    description: 'منصة رعاية صحية سعودية متكاملة: استشارات، أدوية، تحاليل، أشعة، رعاية منزلية، وطوارئ.',
    areaServed: { '@type': 'Country', name: 'Saudi Arabia' },
  };

  return (
    <>
      <Head>
        <title>نبض | منصة الرعاية الصحية الشاملة في السعودية</title>
        <meta name="description" content="احجز طبيبًا، اطلب دواءك، تحاليل وأشعة حتى باب البيت، رعاية منزلية وطوارئ — كل خدماتك الصحية في تطبيق واحد." />
        <link rel="canonical" href={SITE} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="نبض | منصة الرعاية الصحية الشاملة" />
        <meta property="og:description" content="استشارات، أدوية، تحاليل، أشعة، رعاية منزلية، وطوارئ — في تطبيق واحد." />
        <meta property="og:url" content={SITE} />
        <meta property="og:locale" content="ar_SA" />
        <meta name="twitter:card" content="summary_large_image" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </Head>

      <div dir="rtl" className="min-h-screen bg-gradient-to-b from-teal-50 to-white">
        <header className="max-w-6xl mx-auto flex items-center justify-between px-6 py-5">
          <div className="text-2xl font-black text-teal-700">نبض</div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-slate-500 hover:text-teal-700">دخول المزودين والإدارة</Link>
            <a href="#download" className="bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold px-4 py-2 rounded-lg transition-colors">حمّل التطبيق</a>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-6 pb-20">
          <section className="text-center py-14">
            <h1 className="text-4xl md:text-5xl font-black text-slate-900 leading-tight">
              كل خدماتك الصحية<br />في مكان واحد
            </h1>
            <p className="mt-5 text-lg text-slate-600 max-w-2xl mx-auto leading-8">
              استشارات فيديو فورية وحجز عيادات، أدوية تصلك للبيت، تحاليل وأشعة، رعاية منزلية،
              وخدمة طوارئ على مدار الساعة — بدعم كامل لشركات التأمين السعودية.
            </p>
          </section>

          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {SECTIONS.map((s) => (
              <Link key={s.href} href={s.href} className="bg-white rounded-2xl border border-slate-200 p-6 hover:border-teal-400 hover:shadow-md transition-all group">
                <div className="text-3xl mb-3">{s.icon}</div>
                <h2 className="font-bold text-lg text-slate-900 group-hover:text-teal-700">{s.title}</h2>
                <p className="text-sm text-slate-500 mt-1 leading-6">{s.desc}</p>
              </Link>
            ))}
            <div id="download" className="bg-teal-700 rounded-2xl p-6 text-white flex flex-col justify-between">
              <div>
                <EmptyIcon name="phone" size={36} color="#FFFFFF" className="mb-3" />
                <h2 className="font-bold text-lg">حمّل تطبيق نبض</h2>
                <p className="text-sm text-teal-100 mt-1 leading-6">تجربة كاملة على iOS وأندرويد — إشعارات فورية وتتبع حي لطلباتك.</p>
              </div>
              <div className="mt-4 text-xs text-teal-200">متوفر قريبًا على المتاجر الرسمية</div>
            </div>
          </section>
        </main>

        <footer className="border-t border-slate-200 py-8 text-center text-xs text-slate-400">
          نبض © 2026 — منصة سعودية للرعاية الصحية الرقمية
        </footer>
      </div>
    </>
  );
}
