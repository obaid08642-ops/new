import Head from 'next/head';
import { FraudRiskDashboard } from '@/components/fraud/FraudRiskDashboard';

export default function FraudRiskPage() {
  return (
    <>
      <Head>
        <title>مخاطر الاحتيال | نبض بلس</title>
      </Head>
      <section dir="rtl" className="space-y-6 p-6 md:p-8">
        <header>
          <h1 className="text-3xl font-bold">مخاطر الاحتيال</h1>
          <p className="mt-1 text-sm text-slate-500">ملخص تنبيهات الحوكمة للقراءة فقط من سجلات backend الثابتة.</p>
        </header>
        <FraudRiskDashboard />
      </section>
    </>
  );
}
