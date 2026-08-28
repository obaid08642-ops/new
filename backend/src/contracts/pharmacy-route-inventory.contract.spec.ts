import fs from 'node:fs';
import path from 'node:path';

describe('pharmacy route inventory', () => {
  it('has no duplicate HTTP method plus controller prefix plus route path', () => {
    const root = path.resolve(__dirname, '..');
    const files: string[] = [];
    const visit = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) visit(full);
        else if (entry.isFile() && /\.controller\.ts$/.test(entry.name)) files.push(full);
      }
    };
    visit(root);
    const targetPrefixes = new Set(['orders', 'pharmacy', 'provider/pharmacy', 'patient/pharmacy', 'admin/pharmacy']);
    const seen = new Map<string, string>();
    const duplicates: string[] = [];
    for (const file of files) {
      const source = fs.readFileSync(file, 'utf8');
      const controllers = [...source.matchAll(/@Controller\(\s*['\"]([^'\"]+)['\"]\s*\)/g)].map(m => m[1]);
      const prefixes = controllers.length ? controllers : [''];
      for (const prefix of prefixes) {
        for (const match of source.matchAll(/@(Post|Patch|Put|Delete|Get)\(\s*['\"]([^'\"]*)['\"]\s*\)/g)) {
          const normalizedPrefix = prefix.replace(/^\/+|\/+$/g, '');
          if (![...targetPrefixes].some(target => normalizedPrefix === target || normalizedPrefix.startsWith(`${target}/`))) continue;
          const key = `${match[1].toUpperCase()} ${normalizedPrefix}/${match[2]}`.replace(/\/+/, '/');
          const prior = seen.get(key);
          if (prior && prior !== file) duplicates.push(`${key}: ${prior} and ${file}`);
          else seen.set(key, file);
        }
      }
    }
    expect(duplicates).toEqual([]);
  });
});
