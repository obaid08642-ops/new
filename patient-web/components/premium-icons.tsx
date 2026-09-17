/**
 * Premium Illustrator Icons — كل أيقونة كبيرة (48×48) تدل على خدمتها
 * ليست إيموجي ولا شكل هندسي عشوائي — كل واحدة illustrator مرسومة
 */

export function IconPharmacy({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <rect x="8" y="6" width="32" height="36" rx="8" fill="#5FD9B3" opacity={0.15} />
      <rect x="14" y="10" width="20" height="28" rx="5" fill="white" stroke="#1E332E" strokeWidth={1.5} />
      <rect x="18" y="6" width="12" height="6" rx="3" fill="#5FD9B3" stroke="#1E332E" strokeWidth={1.5} />
      <circle cx="20" cy="22" r="3" fill="#B8E030" stroke="#1E332E" strokeWidth={1.2} />
      <circle cx="28" cy="22" r="3" fill="#FF8A65" stroke="#1E332E" strokeWidth={1.2} />
      <circle cx="24" cy="30" r="3" fill="#5FD9B3" stroke="#1E332E" strokeWidth={1.2} />
      <text x="24" y="38" textAnchor="middle" fontSize="6" fontWeight="700" fill="#1E332E">Rx</text>
    </svg>
  );
}

export function IconConsultation({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <rect x="6" y="6" width="36" height="36" rx="10" fill="#E8F5E9" />
      <path d="M16 20c0-4 3-8 8-8s8 4 8 8c0 3-1.5 6-4 8l-4 5-4-5c-2.5-2-4-5-4-8z" fill="white" stroke="#1E332E" strokeWidth={1.6} />
      <path d="M18 18h3l2-5 4 10 2-4h4" stroke="#5FD9B3" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="24" cy="20" r="2.5" fill="#B8E030" stroke="#1E332E" strokeWidth={1.2} />
    </svg>
  );
}

export function IconLab({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <rect x="6" y="6" width="36" height="36" rx="10" fill="#FFF3E0" />
      <rect x="18" y="10" width="12" height="24" rx="6" fill="white" stroke="#1E332E" strokeWidth={1.5} />
      <rect x="20" y="12" width="8" height="12" rx="4" fill="#5FD9B3" opacity={0.3} />
      <rect x="20" y="26" width="8" height="6" rx="2" fill="#FF8A65" opacity={0.4} />
      <path d="M14 34h20" stroke="#1E332E" strokeWidth={1.5} strokeLinecap="round" />
      <circle cx="24" cy="38" r="2" fill="#5FD9B3" />
    </svg>
  );
}

export function IconHomeCare({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <rect x="6" y="6" width="36" height="36" rx="10" fill="#FCE4EC" />
      <path d="M24 14l10 8v12a2 2 0 0 1-2 2H16a2 2 0 0 1-2-2v-12l10-8z" fill="white" stroke="#1E332E" strokeWidth={1.5} />
      <path d="M22 36v-6h4v6" fill="#5FD9B3" stroke="#1E332E" strokeWidth={1.2} />
      <circle cx="24" cy="22" r="3" fill="#B8E030" stroke="#1E332E" strokeWidth={1.2} />
      <path d="M21 22h6M24 19v6" stroke="#1E332E" strokeWidth={1.2} strokeLinecap="round" />
    </svg>
  );
}

export function IconPregnancy({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <rect x="6" y="6" width="36" height="36" rx="10" fill="#F3E5F5" />
      <circle cx="24" cy="20" r="8" fill="white" stroke="#1E332E" strokeWidth={1.5} />
      <path d="M24 14c-1 2-3 3-5 3" stroke="#5FD9B3" strokeWidth={1.5} strokeLinecap="round" />
      <circle cx="24" cy="20" r="3" fill="#FF8A65" opacity={0.6} />
      <path d="M20 28c2 2 6 2 8 0" stroke="#1E332E" strokeWidth={1.5} strokeLinecap="round" />
    </svg>
  );
}

export function IconRadiology({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <rect x="6" y="6" width="36" height="36" rx="10" fill="#E3F2FD" />
      <rect x="12" y="14" width="24" height="18" rx="4" fill="white" stroke="#1E332E" strokeWidth={1.5} />
      <circle cx="24" cy="23" r="6" fill="none" stroke="#5FD9B3" strokeWidth={1.5} />
      <path d="M21 23h6M24 20v6" stroke="#5FD9B3" strokeWidth={1.5} strokeLinecap="round" />
      <rect x="20" y="36" width="8" height="3" rx="1.5" fill="#1E332E" />
    </svg>
  );
}
