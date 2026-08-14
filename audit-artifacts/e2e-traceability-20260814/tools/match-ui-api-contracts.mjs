import fs from 'node:fs';
import path from 'node:path';

const auditRoot = '/home/ubuntu/nabdah-audit-work';
const traceRoot = path.join(auditRoot, 'traceability');
const sourceRoot = '/home/ubuntu/nabdah-e2e-readonly/backend/nabdah-backend/src';
const outputRoot = path.join(auditRoot, 'contract-mapping');
fs.mkdirSync(outputRoot, { recursive: true });

const trace = JSON.parse(fs.readFileSync(path.join(traceRoot, 'ui-api-traceability.json'), 'utf8'));
const sourceExtensions = new Set(['.ts', '.tsx', '.js', '.jsx']);

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === 'node_modules' ? [] : walk(full);
    return sourceExtensions.has(path.extname(entry.name)) ? [full] : [];
  });
}
function unique(values) { return [...new Set(values.filter(Boolean))]; }
function normalize(value = '') {
  const prepared = String(value)
    .replace(/^\/?\$\{[^}]+\}/, '')
    .replace(/^\/?\{[^}]+\}/, '')
    .replace(/^\/?API_BASE\b/, '');
  return `/${prepared}`
    .replace(/^\/https?:\/\/[^/]+/i, '')
    .replace(/\/+/g, '/')
    .replace(/^\/api\/v1\b/, '')
    .replace(/[?#].*$/, '')
    .replace(/\$\{[^}]+\}/g, ':dynamic')
    .replace(/\{[^}]+\}/g, ':dynamic')
    .replace(/:[A-Za-z0-9_]+/g, ':dynamic')
    .replace(/\/$/, '') || '/';
}
function routeCompatible(uiPath, backendPath) {
  const ui = normalize(uiPath).split('/').filter(Boolean);
  const backend = normalize(backendPath).split('/').filter(Boolean);
  if (ui.length !== backend.length) return false;
  return ui.every((segment, index) => segment === backend[index] || segment === ':dynamic' || backend[index] === ':dynamic');
}
function relative(file) { return path.relative('/home/ubuntu/nabdah-e2e-readonly', file).split(path.sep).join('/'); }

const controllers = [];
for (const file of walk(sourceRoot).filter((item) => item.endsWith('.controller.ts'))) {
  const text = fs.readFileSync(file, 'utf8');
  const controllerMatch = text.match(/@Controller\(\s*["'`]([^"'`]*)["'`]/);
  const controllerPrefix = controllerMatch?.[1] || '';
  const classSecurity = {
    guards: unique([...text.matchAll(/@UseGuards\(([^)]+)\)/g)].map((match) => match[1])).join(', '),
    roles: unique([...text.matchAll(/@Roles\(([^)]+)\)/g)].map((match) => match[1])).join(', '),
  };
  const methodRegex = /@(Get|Post|Put|Patch|Delete)\(\s*(?:["'`]([^"'`]*)["'`])?\s*\)[\s\S]{0,280}?\n\s*(?:async\s+)?(\w+)\s*\(/g;
  for (const match of text.matchAll(methodRegex)) {
    const position = match.index ?? 0;
    const before = text.slice(Math.max(0, position - 900), position);
    const localGuards = unique([...before.matchAll(/@UseGuards\(([^)]+)\)/g)].map((item) => item[1])).join(', ');
    const localRoles = unique([...before.matchAll(/@Roles\(([^)]+)\)/g)].map((item) => item[1])).join(', ');
    controllers.push({
      method: match[1].toUpperCase(),
      declaredPath: `/${[controllerPrefix, match[2] || ''].filter(Boolean).join('/')}`,
      path: normalize(`/api/v1/${[controllerPrefix, match[2] || ''].filter(Boolean).join('/')}`),
      duplicateGlobalPrefix: /^api\/v\d+(?:\/|$)/.test(controllerPrefix),
      handler: match[3],
      source: relative(file),
      guards: localGuards || classSecurity.guards || 'غير مستنتج آلياً',
      roles: localRoles || classSecurity.roles || 'غير مستنتج آلياً',
    });
  }
}

const uiApiUsage = new Map();
for (const screen of trace.screens) {
  for (const endpoint of screen.apiEndpoints) {
    const key = normalize(endpoint);
    const existing = uiApiUsage.get(key) || { endpoint: key, original: new Set(), screens: new Set(), components: new Set() };
    existing.original.add(endpoint);
    existing.screens.add(screen.route);
    existing.components.add(screen.component);
    uiApiUsage.set(key, existing);
  }
}

const mappings = [...uiApiUsage.values()].map((usage) => {
  const exactCandidates = controllers.filter((controller) => normalize(controller.path) === normalize(usage.endpoint));
  const candidates = exactCandidates.length > 0
    ? exactCandidates
    : controllers.filter((controller) => routeCompatible(usage.endpoint, controller.path));
  return {
    endpoint: usage.endpoint,
    original: [...usage.original],
    components: [...usage.components],
    screens: [...usage.screens],
    matchStatus: candidates.length === 0 ? 'UNMATCHED' : candidates.length === 1 ? 'MATCHED' : 'AMBIGUOUS',
    candidates,
  };
}).sort((a, b) => a.matchStatus.localeCompare(b.matchStatus) || a.endpoint.localeCompare(b.endpoint));

const summary = {
  generatedAt: new Date().toISOString(),
  frontendUniqueEndpoints: mappings.length,
  backendControllerEndpoints: controllers.length,
  matched: mappings.filter((row) => row.matchStatus === 'MATCHED').length,
  ambiguous: mappings.filter((row) => row.matchStatus === 'AMBIGUOUS').length,
  unmatched: mappings.filter((row) => row.matchStatus === 'UNMATCHED').length,
  duplicateGlobalPrefixControllers: controllers.filter((row) => row.duplicateGlobalPrefix).length,
};
fs.writeFileSync(path.join(outputRoot, 'ui-backend-contract-mapping.json'), JSON.stringify({ summary, mappings, controllers }, null, 2));
fs.writeFileSync(path.join(outputRoot, 'unmatched-ui-endpoints.json'), JSON.stringify(mappings.filter((row) => row.matchStatus === 'UNMATCHED'), null, 2));

const md = [
  '# مواءمة عقود API بين الواجهات والخلفية',
  '',
  '> النتيجة ثابتة من المصدر ولا تثبت طريقة HTTP أو نجاح التشغيل؛ المسارات غير المطابقة قد تكون مبنية ديناميكياً أو قد تمثل خللاً حقيقياً يحتاج اختبار عقد لاحقاً.',
  '',
  '| المؤشر | العدد |',
  '|---|---:|',
  `| نقاط UI الفريدة | ${summary.frontendUniqueEndpoints} |`,
  `| نقاط المتحكم الخلفي | ${summary.backendControllerEndpoints} |`,
  `| مطابقة واحدة | ${summary.matched} |`,
  `| مطابقة ملتبسة | ${summary.ambiguous} |`,
  `| غير مطابقة | ${summary.unmatched} |`,
  `| تعريفات متحكمات قد تكرر بادئة التطبيق العامة | ${summary.duplicateGlobalPrefixControllers} |`,
  '',
  '## سجل مواءمة الواجهة',
  '',
  '| الحالة | مسار UI | المكوّن | الشاشات | مرشح الخلفية المنشور | حارس/دور مستنتج |',
  '|---|---|---|---|---|---|',
  ...mappings.map((row) => {
    const backend = row.candidates.map((candidate) => `${candidate.duplicateGlobalPrefix ? '⚠️ ' : ''}\`${candidate.method} ${candidate.path}\` (${candidate.source})`).join('<br>') || '—';
    const security = row.candidates.map((candidate) => `${candidate.guards}; ${candidate.roles}`).join('<br>') || '—';
    return `| ${row.matchStatus} | \`${row.endpoint}\` | ${row.components.join(', ')} | ${row.screens.map((screen) => `\`${screen}\``).join('<br>')} | ${backend} | ${security} |`;
  }),
].join('\n');
fs.writeFileSync(path.join(outputRoot, 'UI_BACKEND_CONTRACT_MAPPING.md'), md);
console.log(JSON.stringify(summary, null, 2));
