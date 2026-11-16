import fs from 'fs';
import path from 'path';

// Every place that opens a server-given payment or attachment link in the app must follow https links only.
const root = path.join(__dirname, '..', '..', '..');
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

describe('https-only links in the patient app', () => {
  it.each([
    ['app/payments/result.tsx', 'isHttpsCheckout(paymentUrl)', 'Linking.openURL(paymentUrl)'],
    ['app/pharmacy/payment.tsx', 'isHttpsCheckout(intent.checkoutUrl)', 'Linking.openURL(intent.checkoutUrl)'],
    ['app/consultations/chat-with-doctor.tsx', 'isHttpsCheckout(res?.url)', 'Linking.openURL(res.url)'],
  ])('%s checks the scheme before opening', (file, guard, open) => {
    const src = read(file);
    expect(src).toContain(guard);
    expect(src.indexOf(guard)).toBeLessThan(src.indexOf(open));
  });
});
