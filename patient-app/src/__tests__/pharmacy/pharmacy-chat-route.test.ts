import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { internalRoute } from '../../utils/deepLinks';

const app = join(__dirname, '../../../app/pharmacy');

describe('the web pharmacist chat path opens the app screen', () => {
  it('a link to /pharmacy/chat is an internal route and has a file in app/', () => {
    expect(internalRoute('/pharmacy/chat?orderId=abc')).toBe('/pharmacy/chat?orderId=abc');
    expect(existsSync(join(app, 'chat.tsx'))).toBe(true);
  });
  it('the alias renders the pharmacist chat screen, not a copy', () => {
    expect(readFileSync(join(app, 'chat.tsx'), 'utf8')).toContain("export { default } from './pharmacist-chat';");
  });
  it('the screen reads orderId and the web link\'s id', () => {
    const source = readFileSync(join(app, 'pharmacist-chat.tsx'), 'utf8');
    expect(source).toContain('orderId, id: idParam');
  });
});
