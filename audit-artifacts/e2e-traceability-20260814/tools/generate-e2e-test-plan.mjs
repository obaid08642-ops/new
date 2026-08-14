import fs from 'node:fs';
import path from 'node:path';

const root = '/home/ubuntu/nabdah-audit-work';
const mapping = JSON.parse(fs.readFileSync(path.join(root, 'contract-mapping/ui-backend-contract-mapping.json'), 'utf8'));
const output = path.join(root, 'e2e-plan');
fs.mkdirSync(output, { recursive: true });

const roleMap = {
  patient: ['المريض'],
  provider: ['مزود الخدمة المختص', 'مدير النظام للتحقق من منع التصعيد غير المصرح'],
  admin: ['مدير النظام'],
};
const highRisk = /(payment|wallet|withdrawal|refund|payout|order|cancel|ban|insurance|appointment|emergency|prescription|upload|message|chat|call)/i;

function riskFor(route, methods) {
  if (methods.some((method) => method !== 'GET')) return 'متلف أو مُغيّر للحالة';
  if (highRisk.test(route)) return 'قراءة حساسة';
  return 'قراءة عادية';
}
function eligibility(row, methods) {
  if (row.matchStatus === 'UNMATCHED') return 'إثبات العقد مطلوب أولاً';
  if (methods.length === 0) return 'إثبات طريقة الطلب مطلوب أولاً';
  if (methods.includes('GET')) {
    const readRule = row.endpoint.includes(':dynamic')
      ? 'GET غير متلف؛ يتطلب زوج هويات لاختبار الملكية BOLA'
      : 'GET غير متلف؛ قابل للتنفيذ بعد توفير JWT sandbox';
    return methods.some((method) => method !== 'GET')
      ? `${readRule}؛ أما الطرق المغيّرة للحالة فتحتاج موافقة صريحة`
      : readRule;
  }
  return 'يتطلب موافقة صريحة؛ يتضمن طريقة تغيّر الحالة';
}
function verdict(row, methods) {
  if (row.matchStatus === 'UNMATCHED') return 'معلّق: فرق عقد';
  if (methods.includes('GET')) return 'مؤهل لتحقق قراءة محكوم بالرمز؛ وتظل الطرق المغيّرة معلقة';
  return 'معلّق: موافقة عملية متلفة';
}

const cases = mapping.mappings.map((row, index) => {
  const methods = [...new Set(row.candidates.map((candidate) => candidate.method))];
  const roles = [...new Set(row.components.flatMap((component) => roleMap[component] || ['دور يحتاج تعييناً يدوياً']))];
  return {
    id: `E2E-API-${String(index + 1).padStart(3, '0')}`,
    route: row.endpoint,
    screens: row.screens,
    components: row.components,
    expectedRoles: roles,
    contractStatus: row.matchStatus,
    backendMethods: methods,
    backendCandidates: row.candidates.map((candidate) => ({ method: candidate.method, path: candidate.path, source: candidate.source, guards: candidate.guards, roles: candidate.roles })),
    risk: riskFor(row.endpoint, methods),
    executionEligibility: eligibility(row, methods),
    expectedVerdict: verdict(row, methods),
    assertions: [
      'يستجيب المسار وفق عقده المعلن ولا يرجع خطأ توجيه 404/405 غير مبرر.',
      'يحصل الدور المتوقع على قرار وصول مناسب، ويحصل الدور غير المخول على 401 أو 403 من دون تسريب بيانات.',
      ...(row.endpoint.includes(':dynamic') ? ['لا يمكن لهوية sandbox ثانية قراءة أو تغيير مورد تملكه الهوية الأولى (تحقق BOLA).'] : []),
    ],
  };
});

const summary = {
  totalCases: cases.length,
  readonlyEligible: cases.filter((item) => item.executionEligibility.startsWith('GET غير متلف')).length,
  approvalRequired: cases.filter((item) => item.backendMethods.some((method) => method !== 'GET')).length,
  contractProofRequired: cases.filter((item) => item.executionEligibility.startsWith('إثبات')).length,
  bolaEligible: cases.filter((item) => item.executionEligibility.includes('BOLA')).length,
  risk: Object.fromEntries(['قراءة عادية', 'قراءة حساسة', 'متلف أو مُغيّر للحالة'].map((risk) => [risk, cases.filter((item) => item.risk === risk).length])),
};

const md = [
  '# خطة حالات E2E المحكومة بالأدوار',
  '',
  '> الخطة مولدة من خريطة المسارات وعقود المتحكمات الثابتة. لا تمثل تفويضاً لتشغيل أي طلب متلف على الإنتاج. لا تبدأ المصادقة أو طلبات تغيير الحالة قبل موافقة صريحة، ولا تحفظ الرموز أو كلمات المرور في السجل.',
  '',
  '| المؤشر | العدد |',
  '|---|---:|',
  `| إجمالي حالات API | ${summary.totalCases} |`,
  `| قابلة لقراءة غير متلفة بعد JWT sandbox | ${summary.readonlyEligible} |`,
  `| تتطلب موافقة صريحة لوجود تغيير حالة | ${summary.approvalRequired} |`,
  `| تتطلب إثبات عقد/طريقة قبل التنفيذ | ${summary.contractProofRequired} |`,
  `| مرشحة لتحقق BOLA غير المتلف عند وجود هويتين | ${summary.bolaEligible} |`,
  '',
  '## ضوابط الأدوار',
  '',
  '| الدور | نطاق التحقق | شرط البدء |',
  '|---|---|---|',
  '| المريض | البيانات الشخصية والحجوزات والطلبات الصحية والمالية المقروءة | JWT sandbox للمريض، وهوية مريض ثانية لاختبارات الملكية. |',
  '| الطبيب/المزوّد | قوائم العمل والملف والمرفقات والقرارات حسب التخصص | JWT لكل نوع مزوّد، ومعرّفات كائنات تخص هويات مختلفة. |',
  '| الصيدلي والمنشأة والمختبر والأشعة والتمريض | طوابير التشغيل وملفات النتائج والمخزون والطلبات | JWT لكل دور ومورد مملوك ومورد غير مملوك للاختبارات السلبية. |',
  '| مدير النظام | الإدارة والحوكمة والتقارير مع إثبات منع الأدوار الأخرى | JWT المدير بعد مسار مصادقة معتمد؛ لا تنفذ أوامر إدارية مغيرة للحالة بلا موافقة. |',
  '',
  '## سجل الحالات',
  '',
  '| المعرّف | المسار | الدور المتوقع | العقد | الطريقة الخلفية | المخاطر | أهلية التنفيذ |',
  '|---|---|---|---|---|---|---|',
  ...cases.map((item) => `| ${item.id} | \`${item.route}\` | ${item.expectedRoles.join('<br>')} | ${item.contractStatus} | ${item.backendMethods.join(', ') || 'غير مثبتة'} | ${item.risk} | ${item.executionEligibility} |`),
].join('\n');

fs.writeFileSync(path.join(output, 'E2E_ROLE_BASED_TEST_PLAN.json'), JSON.stringify({ generatedAt: new Date().toISOString(), summary, cases }, null, 2));
fs.writeFileSync(path.join(output, 'E2E_ROLE_BASED_TEST_PLAN.md'), md);
console.log(JSON.stringify(summary, null, 2));
