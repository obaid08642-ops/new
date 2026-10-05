// R11 §5 lead 17. Run: node_modules/.bin/jiti src/lib/json-ld.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { jsonLdHtml } from './json-ld';

test('a "</script>" inside structured data cannot close the script tag', () => {
  const html = jsonLdHtml({ name: '</script><script>alert(document.cookie)</script>' });
  assert.ok(!html.toLowerCase().includes('</script'));
  assert.deepEqual(JSON.parse(html), { name: '</script><script>alert(document.cookie)</script>' });
});

test('no admin page writes raw JSON.stringify into a script tag', () => {
  for (const page of ['pages/s/[type]/[slug].tsx', 'pages/index.tsx']) {
    const src = readFileSync(join(__dirname, '..', page), 'utf8');
    assert.ok(!/__html:\s*JSON\.stringify/.test(src), page);
    assert.ok(/__html:\s*jsonLdHtml\(/.test(src), page);
  }
});
