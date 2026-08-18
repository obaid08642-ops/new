import React, { useState } from 'react';
import Head from 'next/head';

/**
 * M5 / BR-7: RBAC matrix viewer — mirrors the backend source of truth
 * (src/common/permissions.ts ROLE_PERMISSIONS). Enforcement is server-side
 * via JwtAuthGuard + @Roles/@RequirePermissions; dynamic role editing is M6 scope.
 */

const PERMISSIONS: { key: string; group: string; ar: string }[] = [
  { key: 'doctor.create', group: 'الأطباء', ar: 'إنشاء طبيب' },
  { key: 'doctor.edit', group: 'الأطباء', ar: 'تعديل طبيب' },
  { key: 'doctor.read', group: 'الأطباء', ar: 'قراءة طبيب' },
  { key: 'doctor.delete', group: 'الأطباء', ar: 'حذف طبيب' },
  { key: 'appointment.create', group: 'المواعيد', ar: 'إنشاء موعد' },
  { key: 'appointment.read', group: 'المواعيد', ar: 'قراءة موعد' },
  { key: 'appointment.update', group: 'المواعيد', ar: 'تحديث موعد' },
  { key: 'appointment.delete', group: 'المواعيد', ar: 'حذف موعد' },
  { key: 'prescription.create', group: 'الوصفات', ar: 'إنشاء وصفة' },
  { key: 'prescription.read', group: 'الوصفات', ar: 'قراءة وصفة' },
  { key: 'prescription.update', group: 'الوصفات', ar: 'تحديث وصفة' },
  { key: 'prescription.delete', group: 'الوصفات', ar: 'حذف وصفة' },
  { key: 'pharmacy.inventory.edit', group: 'الصيدلية', ar: 'تعديل المخزون' },
  { key: 'pharmacy.inventory.read', group: 'الصيدلية', ar: 'قراءة المخزون' },
  { key: 'lab.result.upload', group: 'المختبر', ar: 'رفع نتيجة' },
  { key: 'lab.result.read', group: 'المختبر', ar: 'قراءة نتيجة' },
  { key: 'radiology.result.upload', group: 'الأشعة', ar: 'رفع تقرير' },
  { key: 'radiology.result.read', group: 'الأشعة', ar: 'قراءة تقرير' },
  { key: 'facility.create', group: 'المنشآت', ar: 'إنشاء منشأة' },
  { key: 'facility.edit', group: 'المنشآت', ar: 'تعديل منشأة' },
  { key: 'facility.read', group: 'المنشآت', ar: 'قراءة منشأة' },
  { key: 'facility.delete', group: 'المنشآت', ar: 'حذف منشأة' },
  { key: 'user.impersonate', group: 'المستخدمون', ar: 'انتحال هوية' },
  { key: 'user.read', group: 'المستخدمون', ar: 'قراءة مستخدم' },
  { key: 'user.edit', group: 'المستخدمون', ar: 'تعديل مستخدم' },
  { key: 'data.export', group: 'البيانات', ar: 'تصدير البيانات' },
  { key: 'data.backup', group: 'البيانات', ar: 'نسخ احتياطي' },
];

const ALL = PERMISSIONS.map((p) => p.key);

const ROLES: { key: string; ar: string; perms: string[] }[] = [
  { key: 'SUPER_ADMIN', ar: 'مدير عام', perms: ALL },
  { key: 'ADMIN', ar: 'مدير', perms: ['doctor.create','doctor.edit','doctor.read','appointment.read','appointment.update','prescription.read','pharmacy.inventory.read','lab.result.read','radiology.result.read','facility.create','facility.edit','facility.read','user.read','user.edit','data.export','data.backup'] },
  { key: 'SUPPORT_AGENT', ar: 'وكيل دعم', perms: ['doctor.read','appointment.read','prescription.read','pharmacy.inventory.read','lab.result.read','radiology.result.read','facility.read','user.read','user.impersonate'] },
  { key: 'FINANCE', ar: 'مالية', perms: ['appointment.read','facility.read','data.export'] },
  { key: 'PATIENT', ar: 'مريض', perms: ['doctor.read','appointment.create','appointment.read','appointment.update','prescription.read','facility.read','user.read','user.edit'] },
  { key: 'DOCTOR', ar: 'طبيب', perms: ['doctor.read','doctor.edit','appointment.read','appointment.update','prescription.create','prescription.read','prescription.update','facility.read','user.read'] },
  { key: 'PHARMACIST', ar: 'صيدلي', perms: ['prescription.read','prescription.update','pharmacy.inventory.edit','pharmacy.inventory.read','user.read'] },
  { key: 'PHARMACY', ar: 'صيدلية', perms: ['prescription.read','prescription.update','pharmacy.inventory.edit','pharmacy.inventory.read','user.read'] },
  { key: 'HOSPITAL', ar: 'مستشفى', perms: ['doctor.create','doctor.edit','doctor.read','appointment.read','appointment.update','prescription.read','prescription.create','facility.read','facility.edit','user.read'] },
  { key: 'LAB', ar: 'مختبر', perms: ['lab.result.upload','lab.result.read','user.read'] },
  { key: 'RADIOLOGY', ar: 'أشعة', perms: ['radiology.result.upload','radiology.result.read','user.read'] },
  { key: 'NURSE', ar: 'ممرض', perms: ['appointment.read','appointment.update','prescription.read','user.read'] },
  { key: 'HOME_CARE', ar: 'رعاية منزلية', perms: ['appointment.read','appointment.update','user.read'] },
  { key: 'PHYSIOTHERAPIST', ar: 'علاج طبيعي', perms: ['appointment.read','appointment.update','user.read'] },
  { key: 'DELIVERY', ar: 'توصيل', perms: ['appointment.read','appointment.update','user.read'] },
];

const GROUPS = [...new Set(PERMISSIONS.map((p) => p.group))];

export default function RbacPage() {
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

  const visibleRoles = selectedRole ? ROLES.filter((r) => r.key === selectedRole) : ROLES;
  const visiblePerms = selectedGroup ? PERMISSIONS.filter((p) => p.group === selectedGroup) : PERMISSIONS;

  return (
    <>
      <Head><title>الأدوار والصلاحيات | نبض</title></Head>
        <div className="p-8 space-y-6">
          <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-5 text-sm text-indigo-900 leading-7">
            <strong>كيف تُفرض الصلاحيات (BR-7):</strong> هذه المصفوفة هي مرآة للمصدر الحقيقي في الباك إند
            (<code className="bg-white px-1 rounded" dir="ltr">common/permissions.ts → ROLE_PERMISSIONS</code>).
            الفرض يتم عبر <code className="bg-white px-1 rounded" dir="ltr">JwtAuthGuard + @Roles/@RequirePermissions</code> على كل مسار،
            مع عزل البيانات (<code className="bg-white px-1 rounded" dir="ltr">@CheckOwnership</code>): المزود لا يرى إلا عملياته والمريض إلا بياناته.
            تعديل الأدوار ديناميكيًا من الواجهة ضمن نطاق M6.
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm text-slate-500 font-bold">الدور:</span>
            <button onClick={() => setSelectedRole(null)} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${!selectedRole ? 'bg-teal-600 text-white' : 'bg-white border border-slate-200'}`}>الكل</button>
            {ROLES.map((r) => (
              <button key={r.key} onClick={() => setSelectedRole(selectedRole === r.key ? null : r.key)} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${selectedRole === r.key ? 'bg-teal-600 text-white' : 'bg-white border border-slate-200'}`}>{r.ar}</button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm text-slate-500 font-bold">المجال:</span>
            <button onClick={() => setSelectedGroup(null)} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${!selectedGroup ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200'}`}>الكل</button>
            {GROUPS.map((g) => (
              <button key={g} onClick={() => setSelectedGroup(selectedGroup === g ? null : g)} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${selectedGroup === g ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200'}`}>{g}</button>
            ))}
          </div>

          {/* Matrix */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-auto">
            <table className="text-center text-xs border-collapse min-w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="p-3 text-right sticky right-0 bg-slate-50 z-10 min-w-[180px]">الصلاحية \ الدور</th>
                  {visibleRoles.map((r) => (
                    <th key={r.key} className="p-3 font-bold text-slate-700 min-w-[70px]">
                      <div>{r.ar}</div>
                      <div className="text-[9px] text-slate-400 font-mono" dir="ltr">{r.key}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visiblePerms.map((p) => (
                  <tr key={p.key} className="hover:bg-slate-50">
                    <td className="p-3 text-right sticky right-0 bg-white z-10">
                      <span className="font-medium text-slate-800">{p.ar}</span>
                      <span className="block text-[9px] text-slate-400 font-mono" dir="ltr">{p.key}</span>
                    </td>
                    {visibleRoles.map((r) => (
                      <td key={r.key} className="p-3">
                        {r.perms.includes(p.key)
                          ? <span className="inline-block w-5 h-5 rounded-full bg-green-100 text-green-700 leading-5 font-bold"></span>
                          : <span className="inline-block w-5 h-5 rounded-full bg-slate-50 text-slate-300 leading-5">—</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="text-xs text-slate-400">
            {visibleRoles.length} دور · {visiblePerms.length} صلاحية معروضة — المجموع الكامل: {ROLES.length} دور × {PERMISSIONS.length} صلاحية.
          </div>
        </div>
    </>
  );
}
