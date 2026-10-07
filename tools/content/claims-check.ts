#!/usr/bin/env node

/**
 * Banned Claims Validator
 * 
 * Scans user-facing content for SFDA-forbidden medical claims and superlatives.
 * Applies the S13 banned-claims list to all user-facing text (not just catalog).
 * 
 * Banned categories:
 * - Absolute cure claims ("cures completely", "يشفي نهائيًا")
 * - 100% guarantees ("100% effective", "100% فعال")
 * - Superlatives ("best", "الأفضل", "#1", "رقم 1")
 * - Miracle/magic language ("miracle", "معجزة", "magic cure")
 * - Permanent results ("permanently heals", "علاج دائم")
 */

import { readFileSync, readdirSync } from 'fs';
import { join, extname, relative } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

// ==================== BANNED CLAIMS PER LOCALE ====================

interface BannedClaim {
  pattern: RegExp;
  locale: string;
  category: string;
  description: string;
  severity: 'error' | 'warning';
}

const BANNED_CLAIMS: BannedClaim[] = [
  // ======== ARABIC (ar) ========
  { pattern: /يشفي\s+(نهائياً?|كاملاً?|تماماً?)/gi, locale: 'ar', category: 'absolute_cure', description: 'Absolute cure claim', severity: 'error' },
  { pattern: /يعالج\s+(نهائياً?|كاملاً?|تماماً?)/gi, locale: 'ar', category: 'absolute_cure', description: 'Absolute treatment claim', severity: 'error' },
  { pattern: /علاج\s+(نهائي|كامل|شافي|مضمون)/gi, locale: 'ar', category: 'absolute_cure', description: 'Guaranteed/final treatment', severity: 'error' },
  { pattern: /شفاء\s+(مضمون|نهائي|كامل)/gi, locale: 'ar', category: 'absolute_cure', description: 'Guaranteed cure', severity: 'error' },
  { pattern: /100%\s*(فعال|ناجح|مضمون|آمن)/gi, locale: 'ar', category: 'guarantee_100', description: '100% guarantee claim', severity: 'error' },
  { pattern: /مضمون\s*100%/gi, locale: 'ar', category: 'guarantee_100', description: '100% guaranteed', severity: 'error' },
  { pattern: /الأفضل|الافضل/gi, locale: 'ar', category: 'superlative', description: 'Superlative "the best"', severity: 'error' },
  { pattern: /رقم\s*1|المركز\s*الأول|رقم واحد/gi, locale: 'ar', category: 'superlative', description: 'Superlative "#1"', severity: 'error' },
  { pattern: /معجزة|معجزه/gi, locale: 'ar', category: 'miracle', description: 'Miracle claim', severity: 'error' },
  { pattern: /سحري|علاج\s*سحري/gi, locale: 'ar', category: 'miracle', description: 'Magic treatment', severity: 'error' },
  { pattern: /دائم|للأبد|مدى\s*الحياة/gi, locale: 'ar', category: 'permanent', description: 'Permanent result claim', severity: 'warning' },
  { pattern: /بدون\s+(أعراض|آثار|مخاطر)/gi, locale: 'ar', category: 'no_side_effects', description: 'No side effects claim', severity: 'error' },
  { pattern: /آمن\s*100%|كامل\s*الآمان/gi, locale: 'ar', category: 'absolute_safety', description: 'Absolute safety claim', severity: 'error' },
  
  // ======== ENGLISH (en) ========
  { pattern: /cures?\s+(completely|permanently|totally)/gi, locale: 'en', category: 'absolute_cure', description: 'Absolute cure claim', severity: 'error' },
  { pattern: /treats?\s+(completely|permanently|totally)/gi, locale: 'en', category: 'absolute_cure', description: 'Absolute treatment claim', severity: 'error' },
  { pattern: /guaranteed\s+(cure|treatment|recovery)/gi, locale: 'en', category: 'absolute_cure', description: 'Guaranteed cure/treatment', severity: 'error' },
  { pattern: /100%\s*(effective|success|guaranteed|safe)/gi, locale: 'en', category: 'guarantee_100', description: '100% guarantee claim', severity: 'error' },
  { pattern: /best\s+(medicine|treatment|doctor|pharmacy|app)/gi, locale: 'en', category: 'superlative', description: 'Superlative "best"', severity: 'error' },
  { pattern: /(^|\s)#1(?=\s|$|[.,!?;:])/gi, locale: 'en', category: 'superlative', description: 'Superlative "#1"', severity: 'error' },
  { pattern: /\bnumber\s*1\b/gi, locale: 'en', category: 'superlative', description: 'Superlative "number 1"', severity: 'error' },
  { pattern: /\btop\s*1\b/gi, locale: 'en', category: 'superlative', description: 'Superlative "top 1"', severity: 'error' },
  { pattern: /miracle\s*(cure|treatment|drug|medicine)/gi, locale: 'en', category: 'miracle', description: 'Miracle claim', severity: 'error' },
  { pattern: /magic\s*(cure|treatment|pill|bullet)/gi, locale: 'en', category: 'miracle', description: 'Magic cure claim', severity: 'error' },
  { pattern: /permanent(ly)?\s*(cure|heal|recovery|fix)/gi, locale: 'en', category: 'permanent', description: 'Permanent result claim', severity: 'warning' },
  { pattern: /no\s+side\s+effects?/gi, locale: 'en', category: 'no_side_effects', description: 'No side effects claim', severity: 'error' },
  { pattern: /100%\s*safe|completely\s*safe/gi, locale: 'en', category: 'absolute_safety', description: 'Absolute safety claim', severity: 'error' },
  
  // ======== URDU (ur) ========
  { pattern: /مکمل\s+علاج/gi, locale: 'ur', category: 'absolute_cure', description: 'Complete cure claim', severity: 'error' },
  { pattern: /پورا\s+علاج/gi, locale: 'ur', category: 'absolute_cure', description: 'Full treatment claim', severity: 'error' },
  { pattern: /۱۰۰%\s*(مؤثر|کامیاب|یقینی|محفوظ)/gi, locale: 'ur', category: 'guarantee_100', description: '100% guarantee', severity: 'error' },
  { pattern: /بہترین/gi, locale: 'ur', category: 'superlative', description: 'Superlative "best"', severity: 'error' },
  { pattern: /نمبر\s*1/gi, locale: 'ur', category: 'superlative', description: 'Superlative "#1"', severity: 'error' },
  { pattern: /معجزہ/gi, locale: 'ur', category: 'miracle', description: 'Miracle claim', severity: 'error' },
  { pattern: /جادوئی/gi, locale: 'ur', category: 'miracle', description: 'Magic claim', severity: 'error' },
  { pattern: /دائمی/gi, locale: 'ur', category: 'permanent', description: 'Permanent claim', severity: 'warning' },
  { pattern: /بغیر\s+(آثار|خطر)/gi, locale: 'ur', category: 'no_side_effects', description: 'No side effects', severity: 'error' },
  
  // ======== HINDI (hi) ========
  { pattern: /पूर्ण\s+इलाज/gi, locale: 'hi', category: 'absolute_cure', description: 'Complete cure claim', severity: 'error' },
  { pattern: /पूरा\s+उपचार/gi, locale: 'hi', category: 'absolute_cure', description: 'Full treatment claim', severity: 'error' },
  { pattern: /१००%\s*(प्रभावी|सफल|गारंटी|सुरक्षित)/gi, locale: 'hi', category: 'guarantee_100', description: '100% guarantee', severity: 'error' },
  { pattern: /सर्वश्रेष्ठ/gi, locale: 'hi', category: 'superlative', description: 'Superlative "best"', severity: 'error' },
  { pattern: /नंबर\s*1/gi, locale: 'hi', category: 'superlative', description: 'Superlative "#1"', severity: 'error' },
  { pattern: /चमत्कार/gi, locale: 'hi', category: 'miracle', description: 'Miracle claim', severity: 'error' },
  { pattern: /जादुई/gi, locale: 'hi', category: 'miracle', description: 'Magic claim', severity: 'error' },
  { pattern: /स्थायी/gi, locale: 'hi', category: 'permanent', description: 'Permanent claim', severity: 'warning' },
  { pattern: /बिना\s+(दुष्प्रभाव|खतरे)/gi, locale: 'hi', category: 'no_side_effects', description: 'No side effects', severity: 'error' },
  
  // ======== BENGALI (bn) ========
  { pattern: /সম্পূর্ণ\s+চিকিত্সা/gi, locale: 'bn', category: 'absolute_cure', description: 'Complete cure claim', severity: 'error' },
  { pattern: /পূর্ণ\s+উপচার/gi, locale: 'bn', category: 'absolute_cure', description: 'Full treatment claim', severity: 'error' },
  { pattern: /১০০%\s*(কার্যকর|সফল|গ্যারান্টি|নিরাপদ)/gi, locale: 'bn', category: 'guarantee_100', description: '100% guarantee', severity: 'error' },
  { pattern: /সেরা/gi, locale: 'bn', category: 'superlative', description: 'Superlative "best"', severity: 'error' },
  { pattern: /নম্বর\s*1/gi, locale: 'bn', category: 'superlative', description: 'Superlative "#1"', severity: 'error' },
  { pattern: /চমৎকার/gi, locale: 'bn', category: 'miracle', description: 'Miracle claim', severity: 'error' },
  { pattern: /জাদুকরি/gi, locale: 'bn', category: 'miracle', description: 'Magic claim', severity: 'error' },
  { pattern: /স্থায়ী/gi, locale: 'bn', category: 'permanent', description: 'Permanent claim', severity: 'warning' },
  { pattern: /বिना\s+(পার্শ্বপ্রভাব|ঝুঁকি)/gi, locale: 'bn', category: 'no_side_effects', description: 'No side effects', severity: 'error' },
  
  // ======== FILIPINO (fil) ========
  { pattern: /lubusang\s+gamot/gi, locale: 'fil', category: 'absolute_cure', description: 'Complete cure claim', severity: 'error' },
  { pattern: /kumpletong\s+gamot/gi, locale: 'fil', category: 'absolute_cure', description: 'Full treatment claim', severity: 'error' },
  { pattern: /100%\s*(epektibo|tagumpay|garantisado|ligtas)/gi, locale: 'fil', category: 'guarantee_100', description: '100% guarantee', severity: 'error' },
  { pattern: /pinakamahusay/gi, locale: 'fil', category: 'superlative', description: 'Superlative "best"', severity: 'error' },
  { pattern: /number\s*1|numero\s*uno/gi, locale: 'fil', category: 'superlative', description: 'Superlative "#1"', severity: 'error' },
  { pattern: /himala/gi, locale: 'fil', category: 'miracle', description: 'Miracle claim', severity: 'error' },
  { pattern: /magic/gi, locale: 'fil', category: 'miracle', description: 'Magic claim', severity: 'error' },
  { pattern: /permanente/gi, locale: 'fil', category: 'permanent', description: 'Permanent claim', severity: 'warning' },
  { pattern: /walang\s+(side effect|epekto|panganib)/gi, locale: 'fil', category: 'no_side_effects', description: 'No side effects', severity: 'error' },
];

// ==================== FILE SCANNING ====================

const SCAN_PATTERNS = ['.json', '.ts', '.tsx', '.js', '.jsx', '.md', '.mdx', '.html', '.txt'];
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
  return SCAN_PATTERNS.includes(ext);
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
  line: number;
  column: number;
  locale: string;
  category: string;
  description: string;
  severity: 'error' | 'warning';
  matchedText: string;
  context: string;
}

function scanFile(filePath: string): Violation[] {
  const violations: Violation[] = [];
  
  try {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    
    for (let lineNum = 0; lineNum < lines.length; lineNum++) {
      const line = lines[lineNum];
      
      for (const claim of BANNED_CLAIMS) {
        const regex = new RegExp(claim.pattern.source, claim.pattern.flags);
        let match;
        
        while ((match = regex.exec(line)) !== null) {
          violations.push({
            file: relative(process.cwd(), filePath),
            line: lineNum + 1,
            column: match.index + 1,
            locale: claim.locale,
            category: claim.category,
            description: claim.description,
            severity: claim.severity,
            matchedText: match[0],
            context: line.trim().slice(0, 140),
          });
          
          if (match.index === regex.lastIndex) regex.lastIndex++;
        }
      }
    }
  } catch {}
  
  return violations;
}

// ==================== MAIN ====================

function main(): void {
  console.log('🔍 Scanning for banned medical claims (SFDA compliance)...\n');
  
  let allViolations: Violation[] = [];
  let totalFiles = 0;
  const errors: Violation[] = [];
  const warnings: Violation[] = [];
  
  for (const root of SCAN_ROOTS) {
    const rootPath = join(process.cwd(), root);
    const files = findFiles(rootPath);
    totalFiles += files.length;
    
    for (const file of files) {
      const violations = scanFile(file);
      allViolations.push(...violations);
    }
  }
  
  for (const v of allViolations) {
    if (v.severity === 'error') errors.push(v);
    else warnings.push(v);
  }
  
  // Summary by category
  const byCategory = new Map<string, number>();
  for (const v of allViolations) {
    byCategory.set(v.category, (byCategory.get(v.category) || 0) + 1);
  }
  
  // Summary by locale
  const byLocale = new Map<string, number>();
  for (const v of allViolations) {
    byLocale.set(v.locale, (byLocale.get(v.locale) || 0) + 1);
  }
  
  console.log(`📊 Scanned ${totalFiles} files`);
  console.log(`📍 Errors: ${errors.length} | Warnings: ${warnings.length}\n`);
  
  if (byCategory.size > 0) {
    console.log('📋 By category:');
    for (const [cat, count] of byCategory) {
      console.log(`   ${cat}: ${count}`);
    }
    console.log('');
  }
  
  if (byLocale.size > 0) {
    console.log('🌍 By locale:');
    for (const [loc, count] of byLocale) {
      console.log(`   ${loc}: ${count}`);
    }
    console.log('');
  }
  
  if (errors.length > 0) {
    console.log('❌ ERRORS (must fix):\n');
    for (const v of errors) {
      console.log(`📄 ${v.file}:${v.line}:${v.column}`);
      console.log(`   [${v.locale}] ${v.category} — ${v.description}`);
      console.log(`   Matched: "${v.matchedText}"`);
      console.log(`   Context: ${v.context}`);
      console.log('');
    }
  }
  
  if (warnings.length > 0) {
    console.log('⚠️ WARNINGS (review recommended):\n');
    for (const v of warnings) {
      console.log(`📄 ${v.file}:${v.line}:${v.column}`);
      console.log(`   [${v.locale}] ${v.category} — ${v.description}`);
      console.log(`   Matched: "${v.matchedText}"`);
      console.log(`   Context: ${v.context}`);
      console.log('');
    }
  }
  
  if (errors.length === 0 && warnings.length === 0) {
    console.log('✅ No banned claims found — SFDA compliant');
    process.exit(0);
  }
  
  if (errors.length > 0) {
    console.log('🚫 CI FAILED: SFDA-forbidden medical claims detected');
    console.log('\nReplace absolute claims with compliant language:');
    console.log('  ❌ "cures completely" → ✅ "supports treatment of"');
    console.log('  ❌ "100% effective" → ✅ "clinically proven to help"');
    console.log('  ❌ "best medicine" → ✅ "trusted by doctors"');
    console.log('  ❌ "miracle cure" → ✅ "effective treatment option"');
    process.exit(1);
  }
  
  console.log('✅ No blocking errors (warnings only)');
  process.exit(0);
}

main();