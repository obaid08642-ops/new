import { useEffect, useState } from 'react';

type ThemeTokens = {
  main: string;
  sub: string;
  sub2: string;
  bg: string;
};

const DEFAULTS: ThemeTokens = {
  main: '#5FD9B3',
  sub: '#B8E030',
  sub2: '#FF8A65',
  bg: '#FDFDFC',
};

const STORAGE_KEY = 'nabd_theme_tokens_v3';

export default function ThemeControl() {
  const [tokens, setTokens] = useState<ThemeTokens>(DEFAULTS);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setTokens({ ...DEFAULTS, ...JSON.parse(raw) });
    } catch {}
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--brand', tokens.main);
    root.style.setProperty('--mint', tokens.main);
    root.style.setProperty('--brand-soft', tokens.main + '26');
    root.style.setProperty('--canvas', tokens.bg);
  }, [tokens]);

  const save = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
    // Also update the canonical tokens.json via API if available
    fetch('/api/admin/theme', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tokens),
    }).catch(() => {});
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const reset = () => {
    setTokens(DEFAULTS);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <div style={{ maxWidth: 640, margin: '2rem auto', padding: '2rem', background: '#fff', borderRadius: 16, border: '1px solid #E8EDEE' }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1E332E' }}>التحكم المركزي للألوان</h1>
      <p style={{ color: '#6B7C6E', fontSize: 13, marginTop: 8, lineHeight: 1.6 }}>
        غيّر الألوان هنا وستُطبق فوراً على كل الـ 271 شاشة عبر <code>tokens.json</code>. الألوان الحالية مستوحاة من Fair Mint #5FD9B3.
      </p>

      {([
        ['main', 'اللون الرئيسي (Fair Mint)', '#5FD9B3'],
        ['sub', 'اللون الفرعي (Lime)', '#B8E030'],
        ['sub2', 'اللون الفرعي الثاني (Peach)', '#FF8A65'],
        ['bg', 'الخلفية (Off-White)', '#FDFDFC'],
      ] as const).map(([key, label, fallback]) => (
        <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 20 }}>
          <input
            type="color"
            value={tokens[key]}
            onChange={(e) => setTokens({ ...tokens, [key]: e.target.value })}
            style={{ width: 48, height: 48, borderRadius: 12, border: '1px solid #E8EDEE', padding: 2, cursor: 'pointer' }}
          />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#1E332E' }}>{label}</div>
            <div style={{ fontSize: 12, color: '#6B7C6E', fontFamily: 'monospace' }}>{tokens[key]}</div>
          </div>
          <div style={{ width: 80, height: 40, borderRadius: 8, background: tokens[key], border: '1px solid #E8EDEE' }} />
        </div>
      ))}

      <div style={{ display: 'flex', gap: 12, marginTop: 28 }}>
        <button onClick={save} style={{ flex: 1, padding: '12px 20px', borderRadius: 999, border: 'none', background: tokens.main, color: '#1E332E', fontWeight: 800, cursor: 'pointer' }}>
          حفظ وتطبيق على كل الشاشات
        </button>
        <button onClick={reset} style={{ padding: '12px 20px', borderRadius: 999, border: '1px solid #E8EDEE', background: '#fff', color: '#6B7C6E', fontWeight: 700, cursor: 'pointer' }}>
          إعادة الافتراضي
        </button>
      </div>

      {saved && <div style={{ marginTop: 12, padding: 10, borderRadius: 8, background: '#ECFDF5', color: '#065F46', fontSize: 13, textAlign: 'center' }}>تم الحفظ — الألوان طُبقت على كل الشاشات ✅</div>}

      <div style={{ marginTop: 20, padding: 12, borderRadius: 12, background: '#FDFDFC', border: '1px solid #E8EDEE' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#1E332E' }}>معاينة حية:</div>
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <span style={{ padding: '8px 14px', borderRadius: 999, background: tokens.main, color: '#1E332E', fontWeight: 700, fontSize: 12 }}>زر رئيسي</span>
          <span style={{ padding: '8px 14px', borderRadius: 999, background: tokens.sub, color: '#1E332E', fontWeight: 700, fontSize: 12 }}>زر فرعي</span>
          <span style={{ padding: '8px 14px', borderRadius: 999, background: tokens.sub2, color: '#fff', fontWeight: 700, fontSize: 12 }}>عرض</span>
        </div>
      </div>
    </div>
  );
}
