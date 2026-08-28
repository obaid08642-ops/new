import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const sourceRoots = ["app", "client/src", "components-next", "lib", "server", "shared"];
const files = [];
function collect(dir) {
  for (const entry of readdirSync(dir)) {
    const file = join(dir, entry);
    if (statSync(file).isDirectory()) collect(file);
    else if (/\.(ts|tsx)$/.test(file) && !/\.test\.(ts|tsx)$/.test(file)) files.push(file);
  }
}
for (const sourceRoot of sourceRoots) collect(join(root, sourceRoot));

const forbidden = [
  { name: "local guest token", pattern: /guest_token|guest_user/ },
  { name: "protocol success fallback", pattern: /return\\s*\\{\\s*ok\\s*:\\s*true/ },
  { name: "domain fake data marker", pattern: /(?:fake|dummy)\\s+(?:health|medical|patient|order|balance|appointment|report)/i },
];

const findings = [];
for (const file of files) {
  const text = readFileSync(file, "utf8");
  for (const rule of forbidden) {
    if (rule.pattern.test(text)) findings.push(`${rule.name}: ${relative(root, file)}`);
  }
}

if (findings.length) {
  console.error("Truthful runtime gate failed:");
  for (const finding of findings) console.error(`- ${finding}`);
  process.exit(1);
}

console.log(`Truthful runtime gate passed for ${files.length} production source files.`);
