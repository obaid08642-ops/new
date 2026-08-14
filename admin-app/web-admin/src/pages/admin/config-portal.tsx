export default function ConfigPortal() {
  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6" dir="rtl">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">بوابة الإعدادات والنظام المركزية</h1>
        <p className="text-slate-600 mt-2 leading-7">
          تم تعطيل هذه البوابة مؤقتاً. لم يكن مسارها السابق يحفظ إعدادات SLA في مخزن إعدادات موثّق، كما أن مفتاح الصيانة لم يكن يفرض حالة الصيانة على البوابة أو Redis فعلياً.
        </p>
      </div>

      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-950">
        <h2 className="text-xl font-bold">لا توجد حالة تشغيلية معتمدة للعرض أو التعديل</h2>
        <p className="mt-3 leading-7">
          لا تعرض الصفحة قيماً افتراضية مثل مدة الاستشارة أو صلاحية JWT، ولا تسمح بتفعيل وضع صيانة؛ لأن هذه القيم لا تصبح تشغيلية إلا بعد اعتماد عقد خادمي دائم وتوزيع إعدادات قابل للتحقق.
        </p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-bold text-slate-900">شروط إعادة التفعيل</h2>
        <ol className="mt-4 list-decimal space-y-3 pr-6 text-slate-700 leading-7">
          <li>مخزن إعدادات دائم ومراجَع مع سجل تدقيق غير قابل للتعديل وإصدار/rollback واضحين.</li>
          <li>توزيع إعدادات متحقق إلى الخدمات المتأثرة مع قراءة لاحقة تثبت القيمة المطبقة.</li>
          <li>مفتاح صيانة ينفذ في Redis والبوابة فعلياً، مع مصادقة JWT وRBAC وتحكم مزدوج موثق.</li>
          <li>اختبارات staging لتأكيد مسارات التطبيق، الاستعادة، الفشل، وتسجيل جميع القرارات الإدارية.</li>
        </ol>
      </section>
    </div>
  );
}
