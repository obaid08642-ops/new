#!/usr/bin/env node

/**
 * Content Length Validator
 * 
 * Enforces character limits per component type across all locales.
 * Based on COPY_GUIDE.md length limits table.
 */

import { readFileSync, readdirSync } from 'fs';
import { join, extname, relative } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

// ==================== LENGTH LIMITS ====================

interface LengthLimit {
  component: string;
  selector: RegExp;           // Matches key/path in translation files or component prop
  maxChars: number;
  locales: string[];          // Empty = all locales
  severity: 'error' | 'warning';
}

const LENGTH_LIMITS: LengthLimit[] = [
  // Translation key patterns (for i18n JSON files)
  { component: 'pageTitle', selector: /^(pageTitle|title|page\.title|seo\.title)$/i, maxChars: 60, locales: [], severity: 'error' },
  { component: 'metaDescription', selector: /^(metaDescription|description|seo\.description)$/i, maxChars: 160, locales: [], severity: 'error' },
  { component: 'h1', selector: /^(h1|headline|heading|hero\.title)$/i, maxChars: 70, locales: [], severity: 'error' },
  { component: 'subHeadline', selector: /^(subHeadline|subheadline|sub.headline|hero\.subtitle|lead)$/i, maxChars: 120, locales: [], severity: 'warning' },
  { component: 'ctaButton', selector: /^(cta|button|btn|action\.label|cta\.text)$/i, maxChars: 25, locales: [], severity: 'error' },
  { component: 'toast', selector: /^(toast|snackbar|alert|notification\.toast)$/i, maxChars: 100, locales: [], severity: 'error' },
  { component: 'pushTitle', selector: /^(push\.title|notification\.title)$/i, maxChars: 90, locales: [], severity: 'error' },
  { component: 'pushBody', selector: /^(push\.body|notification\.body|notification\.message)$/i, maxChars: 180, locales: [], severity: 'error' },
  { component: 'sms', selector: /^(sms|textMessage|message\.text)$/i, maxChars: 160, locales: [], severity: 'error' },
  { component: 'emailSubject', selector: /^(email\.subject|subject|mail\.subject)$/i, maxChars: 50, locales: [], severity: 'error' },
  { component: 'emailPreheader', selector: /^(email\.preheader|preheader|mail\.preview)$/i, maxChars: 100, locales: [], severity: 'warning' },
  { component: 'errorMessage', selector: /^(error|errorMessage|err\.msg|validation\.message)$/i, maxChars: 140, locales: [], severity: 'error' },
  { component: 'emptyState', selector: /^(emptyState|empty\.state|noData|noResults)$/i, maxChars: 200, locales: [], severity: 'warning' },
  { component: 'onboardingHeadline', selector: /^(onboarding\.headline|onboard\.title)$/i, maxChars: 140, locales: [], severity: 'warning' },
  { component: 'onboardingBody', selector: /^(onboarding\.body|onboard\.description|onboard\.text)$/i, maxChars: 280, locales: [], severity: 'warning' },
  
  // Component prop patterns (for TSX/JSX files)
  { component: 'Button', selector: /<Button[^>]*>([^<]+)<\/Button>|<Button[^>]*label=["']([^"']+)["']/i, maxChars: 25, locales: [], severity: 'error' },
  { component: 'Toast', selector: /<Toast[^>]*>([^<]+)<\/Toast>|<Toast[^>]*message=["']([^"']+)["']/i, maxChars: 100, locales: [], severity: 'error' },
  { component: 'Alert', selector: /<Alert[^>]*>([^<]+)<\/Alert>/i, maxChars: 140, locales: [], severity: 'error' },
];

// ==================== FILE SCANNING ====================

const SCAN_EXTS = ['.json', '.ts', '.tsx', '.js', '.jsx'];
const EXCLUDE_DIRS = ['node_modules', '.git', 'dist', 'build', '.next', '.expo', 'coverage', '.turbo', 'docs/review', 'docs/release', 'docs/audit', 'backend', 'docs/deploy'];
const SCAN_ROOTS = ['patient-app', 'patient-web', 'provider-app', 'admin', 'docs/content', 'docs/design'];

function shouldScanFile(filePath: string): boolean {
  const relPath = relative(process.cwd(), filePath);
  for (const exclude of EXCLUDE_DIRS) {
    if (relPath.includes(exclude) || relPath.startsWith(exclude)) return false;
  }
  const inScanRoot = SCAN_ROOTS.some(root => relPath.startsWith(root));
  if (!inScanRoot) return false;
  const ext = extname(filePath).toLowerCase();
  return SCAN_EXTS.includes(ext);
}

function findFiles(dir: string): string[] {
  const files: string[] = [];
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!EXCLUDE_DIRS.some(ex => entry.name === ex)) {
          files.push(...findFiles(fullPath));
        }
      } else if (entry.isFile() && shouldScanFile(fullPath)) {
        files.push(fullPath);
      }
    }
  } catch {}
  return files;
}

interface Violation {
  file: string;
  line?: number;
  component: string;
  key?: string;
  locale?: string;
  maxChars: number;
  actualChars: number;
  severity: 'error' | 'warning';
  context: string;
}

function scanJsonFile(filePath: string): Violation[] {
  const violations: Violation[] = [];
  
  try {
    const content = readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);
    
    // Extract locale from filename (e.g., ar.json, en.json)
    const fileName = filePath.split('/').pop() || '';
    const localeMatch = fileName.match(/^([a-z]{2,3})\.json$/);
    const locale = localeMatch ? localeMatch[1] : 'unknown';
    
    function traverse(obj: any, path: string[] = []) {
      for (const [key, value] of Object.entries(obj)) {
        const currentPath = [...path, key].join('.');
        
        if (typeof value === 'string') {
          for (const limit of LENGTH_LIMITS) {
            if (limit.selector.test(key) || limit.selector.test(currentPath)) {
              if (limit.locales.length === 0 || limit.locales.includes(locale)) {
                if (value.length > limit.maxChars) {
                  violations.push({
                    file: relative(process.cwd(), filePath),
                    component: limit.component,
                    key: currentPath,
                    locale,
                    maxChars: limit.maxChars,
                    actualChars: value.length,
                    severity: limit.severity,
                    context: value.slice(0, 100),
                  });
                }
              }
            }
          }
        } else if (typeof value === 'object' && value !== null) {
          traverse(value, [...path, key]);
        }
      }
    }
    
    traverse(data);
  } catch {}
  
  return violations;
}

function scanCodeFile(filePath: string): Violation[] {
  const violations: Violation[] = [];
  
  try {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    
    for (let lineNum = 0; lineNum < lines.length; lineNum++) {
      const line = lines[lineNum];
      
      for (const limit of LENGTH_LIMITS) {
        // Only apply component prop patterns to code files
        if (limit.component === 'Button' || limit.component === 'Toast' || limit.component === 'Alert') {
          const matches = line.matchAll(limit.selector);
          for (const match of matches) {
            const text = match[1] || match[2] || '';
            if (text.length > limit.maxChars) {
              violations.push({
                file: relative(process.cwd(), filePath),
                line: lineNum + 1,
                component: limit.component,
                maxChars: limit.maxChars,
                actualChars: text.length,
                severity: limit.severity,
                context: line.trim().slice(0, 120),
              });
            }
          }
        }
      }
    }
  } catch {}
  
  return violations;
}

// ==================== MAIN ====================

function main(): void {
  console.log('📏 Checking content length limits...\n');
  
  let allViolations: Violation[] = [];
  let totalFiles = 0;
  const errors: Violation[] = [];
  const warnings: Violation[] = [];
  
  for (const root of SCAN_ROOTS) {
    const rootPath = join(process.cwd(), root);
    const files = findFiles(rootPath);
    totalFiles += files.length;
    
    for (const file of files) {
      const ext = extname(file).toLowerCase();
      let violations: Violation[] = [];
      
      if (ext === '.json') {
        violations = scanJsonFile(file);
      } else {
        violations = scanCodeFile(file);
      }
      
      allViolations.push(...violations);
    }
  }
  
  for (const v of allViolations) {
    if (v.severity === 'error') errors.push(v);
    else warnings.push(v);
  }
  
  console.log(`📊 Scanned ${totalFiles} files`);
  console.log(`📍 Errors: ${errors.length} | Warnings: ${warnings.length}\n`);
  
  if (errors.length > 0) {
    console.log('❌ ERRORS (exceed length limits):\n');
    for (const v of errors) {
      const loc = v.line ? `:${v.line}` : '';
      const key = v.key ? ` [${v.key}]` : '';
      const locale = v.locale ? ` (${v.locale})` : '';
      console.log(`📄 ${v.file}${loc}${key}${locale}`);
      console.log(`   ${v.component}: ${v.actualChars}/${v.maxChars} chars`);
      console.log(`   Text: "${v.context}"`);
      console.log('');
    }
  }
  
  if (warnings.length > 0) {
    console.log('⚠️ WARNINGS (approaching limits):\n');
    for (const v of warnings) {
      const loc = v.line ? `:${v.line}` : '';
      const key = v.key ? ` [${v.key}]` : '';
      const locale = v.locale ? ` (${v.locale})` : '';
      console.log(`📄 ${v.file}${loc}${key}${locale}`);
      console.log(`   ${v.component}: ${v.actualChars}/${v.maxChars} chars`);
      console.log(`   Text: "${v.context}"`);
      console.log('');
    }
  }
  
  if (errors.length === 0 && warnings.length === 0) {
    console.log('✅ All content within length limits');
    process.exit(0);
  }
  
  if (errors.length > 0) {
    console.log('🚫 CI FAILED: Content exceeds length limits');
    console.log('\nSee COPY_GUIDE.md for component length limits per locale.');
    process.exit(1);
  }
  
  console.log('✅ No blocking errors (warnings only)');
  process.exit(0);
}

main();