# Phase 0D semantic evidence

- **Surface:** Admin
- **Archive:** `web_admin_dashboard.zip`
- **Member path:** `src/pages/admin/rbac.tsx`
- **Member SHA-256:** `1ce439fc9d76aad7d793c5a13302b8516a23aab14056b5dec75ab69df208d11f`
- **Line count:** 137
- **Read range:** `1-137`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `25: { key: 'lab.result.upload', group: 'المختبر', ar: 'رفع نتيجة' },`
- `27: { key: 'radiology.result.upload', group: 'الأشعة', ar: 'رفع تقرير' },`
- `52: { key: 'LAB', ar: 'مختبر', perms: ['lab.result.upload','lab.result.read','user.read'] },`
- `53: { key: 'RADIOLOGY', ar: 'أشعة', perms: ['radiology.result.upload','radiology.result.read','user.read'] },`
- `62: export default function RbacPage() {`
- `84: <button onClick={() => setSelectedRole(null)} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${!selectedRole ? 'bg-teal-600 text-white' : 'bg-white border border-slate-200'}`}>الكل</button>`
- `86: <button key={r.key} onClick={() => setSelectedRole(selectedRole === r.key ? null : r.key)} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${selectedRole === r.key ? 'bg-teal-600 text-white' : 'bg-white border border-slate-200'}`}>{r.a`
- `91: <button onClick={() => setSelectedGroup(null)} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${!selectedGroup ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200'}`}>الكل</button>`
- `93: <button key={g} onClick={() => setSelectedGroup(selectedGroup === g ? null : g)} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${selectedGroup === g ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200'}`}>{g}</button>`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `6: * (src/common/permissions.ts ROLE_PERMISSIONS). Enforcement is server-side`
- `7: * via JwtAuthGuard + @Roles/@RequirePermissions; dynamic role editing is M6 scope.`
- `10: const PERMISSIONS: { key: string; group: string; ar: string }[] = [`
- `40: const ALL = PERMISSIONS.map((p) => p.key);`
- `42: const ROLES: { key: string; ar: string; perms: string[] }[] = [`
- `43: { key: 'SUPER_ADMIN', ar: 'مدير عام', perms: ALL },`
- `44: { key: 'ADMIN', ar: 'مدير', perms: ['doctor.create','doctor.edit','doctor.read','appointment.read','appointment.update','prescription.read','pharmacy.inventory.read','lab.result.read','radiology.result.read','facility.create','facility.edit`
- `60: const GROUPS = [...new Set(PERMISSIONS.map((p) => p.group))];`
- `63: const [selectedRole, setSelectedRole] = useState<string | null>(null);`
- `66: const visibleRoles = selectedRole ? ROLES.filter((r) => r.key === selectedRole) : ROLES;`
- `67: const visiblePerms = selectedGroup ? PERMISSIONS.filter((p) => p.group === selectedGroup) : PERMISSIONS;`
- `75: (<code className="bg-white px-1 rounded" dir="ltr">common/permissions.ts → ROLE_PERMISSIONS</code>).`
### state_transitions
- `1: import React, { useState } from 'react';`
- `63: const [selectedRole, setSelectedRole] = useState<string | null>(null);`
- `64: const [selectedGroup, setSelectedGroup] = useState<string | null>(null);`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
