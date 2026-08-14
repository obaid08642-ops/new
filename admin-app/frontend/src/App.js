import React from 'react';
import './App.css';

export default function App() {
  return (
    <main
      style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, background: '#f8fafc', fontFamily: 'sans-serif' }}
      dir="rtl"
    >
      <section style={{ maxWidth: 720, background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 16, padding: 32, color: '#0f172a' }}>
        <h1 style={{ marginTop: 0 }}>لوحة الإدارة القديمة غير متاحة للتشغيل</h1>
        <p style={{ lineHeight: 1.8 }}>
          أُوقفت هذه الواجهة الثانوية لأنها كانت تستدعي عقوداً إدارية مختلفة عن الواجهة الحديثة ولا تملك دليلاً على صلاحيات التشغيل أو سجل تدقيق أو تسوية مالية متكاملة.
        </p>
        <p style={{ lineHeight: 1.8, marginBottom: 0 }}>
          لا تعرض هذه الصفحة مؤشرات أو بيانات مستخدمين، ولا تنفذ حظراً أو اعتماد مزوّد أو قراراً مالياً. يجب استخدام واجهة الإدارة الحديثة بعد تهيئة عنوان API ومصادقة المشرف في بيئة معزولة.
        </p>
      </section>
    </main>
  );
}
