const fs = require('fs');
const path = 'audit-artifacts/full-audit-20260823/phase9-pnpm-audit-prod-after-postcss.json';
const raw = fs.readFileSync(path, 'utf8');
const data = JSON.parse(raw);
const rows = [];
for (const [key, value] of Object.entries(data.advisories || {})) {
  if (value && typeof value === 'object') rows.push({ key, module: value.module_name, severity: value.severity, title: value.title, url: value.url, vulnerable_versions: value.vulnerable_versions, patched_versions: value.patched_versions });
}
if (!rows.length && data.packages && typeof data.packages === 'object') {
  for (const [key, value] of Object.entries(data.packages)) {
    if (value && value.severity) rows.push({ key, module: value.module_name || key, severity: value.severity, title: value.title, url: value.url, vulnerable_versions: value.vulnerable_versions, patched_versions: value.patched_versions });
  }
}
fs.writeFileSync('audit-artifacts/full-audit-20260823/phase9-prod-advisories-normalized.json', JSON.stringify(rows, null, 2) + '\n');
console.log(JSON.stringify(rows, null, 2));
