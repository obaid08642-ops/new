import Head from 'next/head';
import { ReleaseDisciplineDashboard } from '@/components/release/ReleaseDisciplineDashboard';

export default function ReleaseDisciplinePage() {
  return (
    <>
      <Head>
        <title>انضباط الإصدارات | نبض بلس</title>
      </Head>
      <section dir="rtl" className="space-y-6 p-6 md:p-8">
        <header>
          <h1 className="text-3xl font-bold">انضباط الإصدارات</h1>
          <p className="mt-1 text-sm text-slate-500">وضع التحديث الإجباري والصيانة لكل تطبيق من إعدادات المنصة.</p>
        </header>
        <ReleaseDisciplineDashboard />
      </section>
    </>
  );
}
