import fs from 'node:fs';
import path from 'node:path';

const root = '/home/ubuntu/nabdah-audit-work/contract-mapping';
const mapping = JSON.parse(fs.readFileSync(path.join(root, 'ui-backend-contract-mapping.json'), 'utf8'));
const stop = new Set(['api', 'v1', 'v2', 'dynamic', 'admin', 'provider', 'providers', 'patient', 'patients', 'me']);

function tokens(route) {
  return new Set(route.split('/').filter(Boolean).filter((part) => !stop.has(part)));
}
function similarity(left, right) {
  const a = tokens(left);
  const b = tokens(right);
  if (!a.size || !b.size) return 0;
  const overlap = [...a].filter((token) => b.has(token)).length;
  return overlap / new Set([...a, ...b]).size;
}
function impact(endpoint) {
  if (/(payment|wallet|withdrawal|refund|order|insurance|appointment|emergency|force-cancel|ban)/.test(endpoint)) return 'عالية';
  if (/(admin|provider|nursing|lab|radiology|pharmacy|health|medical|home-care)/.test(endpoint)) return 'متوسطة';
  return 'منخفضة';
}

const gaps = mapping.mappings.filter((row) => row.matchStatus === 'UNMATCHED').map((row) => {
  const nearby = mapping.controllers
    .map((controller) => ({ controller, score: similarity(row.endpoint, controller.path) }))
    .filter((row) => row.score >= 0.25)
    .sort((a, b) => b.score - a.score || a.controller.path.localeCompare(b.controller.path))
    .slice(0, 5);
  const classification = nearby.length === 0
    ? 'NO_STATIC_BACKEND_EVIDENCE'
    : nearby[0].score >= 0.5
      ? 'LIKELY_ROUTE_DRIFT'
      : 'PARTIAL_CONTRACT_OVERLAP';
  return {
    ...row,
    classification,
    impact: impact(row.endpoint),
    nearby: nearby.map(({ controller, score }) => ({
      score: Number(score.toFixed(2)),
      method: controller.method,
      path: controller.path,
      source: controller.source,
      guards: controller.guards,
      roles: controller.roles,
    })),
  };
});

const counts = Object.fromEntries(['NO_STATIC_BACKEND_EVIDENCE', 'LIKELY_ROUTE_DRIFT', 'PARTIAL_CONTRACT_OVERLAP'].map((key) => [key, gaps.filter((row) => row.classification === key).length]));
const priority = ['عالية', 'متوسطة', 'منخفضة'];
const md = [
  '# تصنيف فجوات عقود API الثابتة',
  '',
  '> هذا التصنيف دليل فرز لمراجعة العقد واختبارات E2E. لا تعني فئة `NO_STATIC_BACKEND_EVIDENCE` أن الخدمة غير موجودة حتماً؛ فقد تكون خلف proxy أو مولدة أو خارج شجرة المصدر المستعادة. كما لا تثبت المطابقة نجاح التنفيذ أو الصلاحية.',
  '',
  '| الفئة | العدد | الدلالة |',
  '|---|---:|---|',
  `| NO_STATIC_BACKEND_EVIDENCE | ${counts.NO_STATIC_BACKEND_EVIDENCE} | لا يوجد تشابه كافٍ مع متحكم NestJS المستخرج. |`,
  `| LIKELY_ROUTE_DRIFT | ${counts.LIKELY_ROUTE_DRIFT} | توجد وجهة خلفية قريبة يرجح أنها تختلف في اسم أو تركيب المسار. |`,
  `| PARTIAL_CONTRACT_OVERLAP | ${counts.PARTIAL_CONTRACT_OVERLAP} | يوجد تداخل موضوعي لكنه لا يكفي لإثبات بديل متوافق. |`,
  '',
  '## الأولويات',
  '',
  '| التأثير | العدد |',
  '|---|---:|',
  ...priority.map((level) => `| ${level} | ${gaps.filter((row) => row.impact === level).length} |`),
  '',
  '## السجل التفصيلي',
  '',
  '| التأثير | التصنيف | مسار الواجهة | الشاشات | أقرب أدلة خلفية ثابتة |',
  '|---|---|---|---|---|',
  ...gaps.map((row) => `| ${row.impact} | ${row.classification} | \`${row.endpoint}\` | ${row.screens.map((screen) => `\`${screen}\``).join('<br>')} | ${row.nearby.map((item) => `\`${item.method} ${item.path}\` (${item.score})`).join('<br>') || '—'} |`),
].join('\n');

fs.writeFileSync(path.join(root, 'contract-gap-classification.json'), JSON.stringify({ generatedAt: new Date().toISOString(), counts, gaps }, null, 2));
fs.writeFileSync(path.join(root, 'CONTRACT_GAP_CLASSIFICATION.md'), md);
console.log(JSON.stringify({ total: gaps.length, counts, byImpact: Object.fromEntries(priority.map((level) => [level, gaps.filter((row) => row.impact === level).length])) }, null, 2));
