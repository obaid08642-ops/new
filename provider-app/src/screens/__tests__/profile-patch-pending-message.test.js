// cc2f1b8 review: PATCH /provider/profile only files a change request for admin
// review (pending_review: true). Every screen that sends it must say so; the
// ambulance profile told the user "تم حفظ الملف" and the old values came back.
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const files = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
  const p = path.join(dir, e.name);
  if (e.isDirectory()) return e.name === '__tests__' ? [] : files(p);
  return /\.tsx?$/.test(e.name) ? [p] : [];
});

describe('profile edits are reported as sent for review', () => {
  const senders = files(root).filter((f) => fs.readFileSync(f, 'utf8').includes("client.patch('/provider/profile'"));

  it('finds the screens that edit the profile', () => {
    expect(senders.map((f) => path.basename(f))).toContain('AmbulanceDashboard.tsx');
  });

  it.each(senders.map((f) => [path.relative(root, f), f]))('%s says the change applies after admin approval', (_rel, f) => {
    const src = fs.readFileSync(f, 'utf8');
    expect(src).toContain('تُطبق بعد اعتماد الإدارة');
    expect(src).not.toContain("'تم حفظ الملف'");
  });
});
