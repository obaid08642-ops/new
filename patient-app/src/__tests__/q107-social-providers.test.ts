// Q107: the backend accepts only Google and Apple sign-in now (it can verify
// their tokens). The X and Snapchat buttons would only ever get 400.
import * as fs from 'fs';
import * as path from 'path';

describe('patient app offers only verifiable social sign-in (Q107)', () => {
  for (const screen of ['login.tsx', 'register.tsx']) {
    it(`${screen} has no X or Snapchat sign-in`, () => {
      const src = fs.readFileSync(path.join(__dirname, '..', '..', 'app', '(auth)', screen), 'utf8');
      expect(src).not.toMatch(/handleOAuthBackend\('x'|handleOAuthBackend\('snapchat'|snapchat-ghost|x-twitter|EXPO_PUBLIC_X_CLIENT_ID|EXPO_PUBLIC_SNAPCHAT_CLIENT_ID/);
      expect(src).toMatch(/handleOAuthBackend\('google'/);
    });
  }
});
