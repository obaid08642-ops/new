import Head from 'next/head';
import { ExperimentsDashboard } from '@/components/analytics/ExperimentsDashboard';

export default function ExperimentsPage() {
  return (
    <>
      <Head>
        <title>تجارب النمو | نبض بلس</title>
      </Head>
      <section dir="rtl" className="space-y-6 p-6 md:p-8">
        <header>
          <h1 className="text-3xl font-bold">تجارب النمو</h1>
          <p className="mt-1 text-sm text-slate-500">التحويل والاحتفاظ ورضا المستخدم من تجميعات backend الحقيقية.</p>
        </header>
        <ExperimentsDashboard />
      </section>
    </>
  );
}
