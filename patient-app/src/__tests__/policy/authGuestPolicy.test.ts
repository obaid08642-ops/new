import fs from 'fs';
import path from 'path';

describe('guest authentication policy', () => {
  it('does not invoke the legacy guest endpoint or restore guest sessions from app entry points', () => {
    const appDir = path.resolve(__dirname, '../../../app');
    const files = [
      path.join(appDir, '_layout.tsx'),
      path.join(appDir, '(auth)', 'welcome.tsx'),
    ];

    for (const file of files) {
      const source = fs.readFileSync(file, 'utf8');
      expect(source).not.toContain('/auth/guest');
      expect(source).not.toContain('guestLogin(');
      expect(source).not.toContain('GUEST_MODE');
    }
  });
});
