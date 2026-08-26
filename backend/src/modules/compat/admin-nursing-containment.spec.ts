import fs from 'node:fs';
import path from 'node:path';

describe('admin nursing containment source contract', () => {
  const source = fs.readFileSync(path.resolve(__dirname, 'admin-spa.module.ts'), 'utf8');

  it('fails closed before reading requests with addresses or assigning an arbitrary provider', () => {
    expect(source).toContain("throw new ServiceUnavailableException('admin nursing operations are unavailable");
    expect(source).toContain("throw new ServiceUnavailableException('admin nursing assignment is unavailable");
  });
});
