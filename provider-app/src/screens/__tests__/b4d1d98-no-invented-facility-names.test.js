// b4d1d98 (REVIEW_P13): six screens showed an invented facility name
// ("مستشفى نبضة الطبي" / "Nabd+ Medical Hospital", "معمل نبضة الطبي" /
// "Nabd+ Medical Lab") instead of the provider's own name, and the session
// fell back to the placeholder "Nabd Provider". Screens now show the
// provider's real display name (or the account email).
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', '..');
const files = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
  const p = path.join(dir, e.name);
  if (e.isDirectory()) return e.name === '__tests__' ? [] : files(p);
  return /\.tsx?$/.test(e.name) ? [p] : [];
});

describe('no invented facility names in the provider app', () => {
  it('no screen hard-codes a Nabd facility name', () => {
    const offenders = files(root).filter((f) => /نبضة الطبي|Nabd\+ Medical (Hospital|Lab)|'Nabd Provider'/.test(fs.readFileSync(f, 'utf8')));
    expect(offenders.map((f) => path.relative(root, f))).toEqual([]);
  });

  it('the display name comes from the profile, in the user language', () => {
    const { providerDisplayName } = require('../../utils/provider-display-name');
    const user = { nameAr: 'مختبر الأمل', nameEn: 'Al Amal Lab', email: 'lab@example.test' };
    expect(providerDisplayName(user, true)).toBe('مختبر الأمل');
    expect(providerDisplayName(user, false)).toBe('Al Amal Lab');
    expect(providerDisplayName({ nameAr: '', nameEn: '', email: 'lab@example.test' }, true)).toBe('lab@example.test');
  });
});
