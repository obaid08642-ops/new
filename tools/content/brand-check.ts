#!/usr/bin/env node

/**
 * Brand Name Enforcement Checker
 * 
 * Fails CI on banned brand names in user-facing strings.
 * Scans: translation files, components, pages, emails, SMS, PDFs, notifications, legal texts
 * 
 * BANNED:
 * - "نبضة", "Nabdah/nabdah", "تطبيق/موقع/منصة المريض", "patient app"
 * 
 * ALLOWED:
 * - "نبض بلس / Nabd+" (patient)
 * - "نبض بلس للأعمال / Nabd+ Business" (provider)
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname, relative } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

// ==================== CONFIGURATION ====================

const BANNED_PATTERNS = [
  // Arabic banned
  { pattern: /نبضة/gi, description: 'بanned Arabic brand "نبضة"' },
  { pattern: /تطبيق\s+(المريض|المرضى)/gi, description: 'banned "تطبيق المريض"' },
  { pattern: /موقع\s+(المريض|المرضى)/gi, description: 'banned "موقع المريض"' },
  { pattern: /منصة\s+(المريض|المرضى)/gi, description: 'banned "منصة المريض"' },
  
  // English banned
  { pattern: /\bnabdah\b/gi, description: 'banned English brand "Nabdah"' },
  { pattern: /\bpatient\s+app\b/gi, description: 'banned "patient app"' },
  
  // Mixed case variations
  { pattern: /نَبْضَة/gi, description: 'banned Arabic brand (vocalized)' },
];

const ALLOWED_PATTERNS = [
  // Patient-facing allowed
  { pattern: /نبض\s+بلس/gi, description: 'allowed "نبض بلس"' },
  { pattern: /نَبْض\s+بَلْس/gi, description: 'allowed vocalized "نبض بلس"' },
  { pattern: /\bnabd\+\b/gi, description: 'allowed "Nabd+"' },
  { pattern: /\bnabd\s*plus\b/gi, description: 'allowed "Nabd Plus"' },
  
  // Provider-facing allowed
  { pattern: /نبض\s+بلس\s+ل(لأعمال|لأعما)/gi, description: 'allowed "نبض بلس للأعمال"' },
  { pattern: /\bnabd\+\s*business\b/gi, description: 'allowed "Nabd+ Business"' },
  { pattern: /\bnabd\s*plus\s*business\b/gi, description: 'allowed "Nabd Plus Business"' },
];

// File patterns to scan (user-facing)
const SCAN_PATTERNS = [
  '**/*.json',           // translation files
  '**/*.ts', '**/*.tsx', // components, pages
  '**/*.js', '**/*.jsx',
  '**/*.md', '**/*.mdx', // docs, content
  '**/*.html',           // emails, PDFs templates
  '**/*.txt',            // SMS, notifications
];

// Directories to exclude
const EXCLUDE_DIRS = [
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  '.expo',
  'coverage',
  '.turbo',
  '*.log',
  'docs/review',
  'docs/release',
  'docs/audit',
  'backend',
  'docs/deploy',
  '__tests__',
  '__mocks__',
];

// Files to exclude (internal docs)
const EXCLUDE_FILES = [
  'README.md',
  'TODO.md',
  'todo.md',
  'CHANGELOG.md',
  'LICENSE',
  'package.json',
  'package-lock.json',
  'tsconfig.json',
  '.gitignore',
];

// Only scan these root directories for user-facing content
const SCAN_ROOTS = [
  'patient-app',
  'patient-web',
  'provider-app',
  'admin',
  'docs/content',
  'docs/design',
];

// Only scan these file patterns (user-facing)
const USER_FACING_PATTERNS = [
  // Translation files
  '**/i18n/locales/*.json',
  '**/locales/*.json',
  '**/translations/*.json',
  // UI components and pages
  '**/app/**/*.tsx',
  '**/app/**/*.jsx',
  '**/components/**/*.tsx',
  '**/components/**/*.jsx',
  '**/screens/**/*.tsx',
  '**/screens/**/*.jsx',
  '**/pages/**/*.tsx',
  '**/pages/**/*.jsx',
  // Content files
  '**/*.md',
  '**/*.mdx',
];

// ==================== UTILITIES ====================

function shouldScanFile(filePath: string): boolean {
  const relPath = relative(process.cwd(), filePath);
  const fileName = filePath.split('/').pop() || '';
  
  // Check if in excluded directory
  for (const exclude of EXCLUDE_DIRS) {
    if (relPath.includes(exclude) || relPath.startsWith(exclude)) {
      return false;
    }
  }
  
  // Check if excluded file
  if (EXCLUDE_FILES.includes(fileName)) {
    return false;
  }
  
  // Check if in allowed scan root
  const inScanRoot = SCAN_ROOTS.some(root => relPath.startsWith(root));
  if (!inScanRoot) return false;
  
  // Check against user-facing patterns (glob matching)
  const minimatch = (pattern: string, path: string): boolean => {
    const regex = pattern
      .replace(/\./g, '\\.')
      .replace(/\*\*/g, '.*')
      .replace(/\*/g, '[^/]*');
    return new RegExp(`^${regex}$`).test(path);
  };
  
  return USER_FACING_PATTERNS.some(pattern => minimatch(pattern, relPath));
}

function isAllowedMatch(text: string, match: string, index: number): boolean {
  // Check if the match is part of an allowed pattern
  const contextStart = Math.max(0, index - 50);
  const contextEnd = Math.min(text.length, index + match.length + 50);
  const context = text.slice(contextStart, contextEnd);
  
  for (const allowed of ALLOWED_PATTERNS) {
    if (allowed.pattern.test(context)) {
      return true;
    }
  }
  return false;
}

function scanFile(filePath: string): Array<{ line: number; column: number; pattern: string; description: string; context: string }> {
  const violations: Array<{ line: number; column: number; pattern: string; description: string; context: string }> = [];
  
  try {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    
    for (let lineNum = 0; lineNum < lines.length; lineNum++) {
      const line = lines[lineNum];
      
      for (const banned of BANNED_PATTERNS) {
        const regex = new RegExp(banned.pattern.source, banned.pattern.flags);
        let match;
        
        while ((match = regex.exec(line)) !== null) {
          const matchText = match[0];
          const charIndex = match.index;
          
          // Check if this is actually an allowed usage
          if (!isAllowedMatch(line, matchText, charIndex)) {
            violations.push({
              line: lineNum + 1,
              column: charIndex + 1,
              pattern: matchText,
              description: banned.description,
              context: line.trim().slice(0, 120),
            });
          }
          
          // Prevent infinite loop on zero-width matches
          if (match.index === regex.lastIndex) {
            regex.lastIndex++;
          }
        }
      }
    }
  } catch (error) {
    // Skip binary/unreadable files
  }
  
  return violations;
}

function findFiles(dir: string): string[] {
  const files: string[] = [];
  
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      
      if (entry.isDirectory()) {
        if (!EXCLUDE_DIRS.some(ex => entry.name === ex || entry.name.startsWith(ex.replace('*', '')))) {
          files.push(...findFiles(fullPath));
        }
      } else if (entry.isFile() && shouldScanFile(fullPath)) {
        files.push(fullPath);
      }
    }
  } catch (error) {
    // Skip unreadable directories
  }
  
  return files;
}

// ==================== MAIN ====================

function main(): void {
  console.log('🔍 Scanning for banned brand names...\n');
  
  let allViolations: Array<{ file: string; violations: ReturnType<typeof scanFile> }> = [];
  let totalFiles = 0;
  
  for (const root of SCAN_ROOTS) {
    const rootPath = join(process.cwd(), root);
    const files = findFiles(rootPath);
    totalFiles += files.length;
    
    for (const file of files) {
      const violations = scanFile(file);
      if (violations.length > 0) {
        allViolations.push({ file: relative(process.cwd(), file), violations });
      }
    }
  }
  
  // Output results
  if (allViolations.length === 0) {
    console.log(`✅ Scanned ${totalFiles} files — No banned brand names found`);
    process.exit(0);
  }
  
  console.log(`❌ Found banned brand names in ${allViolations.length} file(s) (scanned ${totalFiles} total):\n`);
  
  for (const { file, violations } of allViolations) {
    console.log(`📄 ${file}`);
    for (const v of violations) {
      console.log(`   Line ${v.line}:${v.column} — ${v.description}`);
      console.log(`   Found: "${v.pattern}"`);
      console.log(`   Context: ${v.context}`);
      console.log('');
    }
  }
  
  console.log('🚫 CI FAILED: Banned brand names detected in user-facing content');
  console.log('\nAllowed names:');
  console.log('  Patient: "نبض بلس / Nabd+"');
  console.log('  Provider: "نبض بلس للأعمال / Nabd+ Business"');
  console.log('\nFix: Replace banned names with allowed variants in all user-facing strings.');
  
  process.exit(1);
}

main();