import React from 'react';

/**
 * Premium inline-SVG empty-state icons — zero dependencies, zero emojis.
 * Used wherever an empty state previously rendered an emoji glyph.
 */
const PATHS: Record<string, string[]> = {
  shield: [
    'M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z',
    'M9 12l2 2 4-4',
  ],
  document: [
    'M7 3h7l5 5v11a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2z',
    'M14 3v5h5',
    'M9 13h6',
    'M9 17h4',
  ],
  wallet: [
    'M3 7a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7z',
    'M16 12h.01',
    'M3 9h18',
  ],
  banknote: [
    'M3 7h18v10H3z',
    'M12 10a2 2 0 100 4 2 2 0 000-4z',
    'M6 7h.01',
    'M18 17h.01',
  ],
  sos: [
    'M12 21c4.97 0 9-4.03 9-9s-4.03-9-9-9-9 4.03-9 9 4.03 9 9 9z',
    'M12 8v5',
    'M12 16h.01',
  ],
  chat: [
    'M21 12a8 8 0 01-8 8H5l-2 2V12a8 8 0 018-8h2a8 8 0 018 8z',
    'M8.5 12h.01',
    'M12 12h.01',
    'M15.5 12h.01',
  ],
  heart: [
    'M12 20s-7-4.5-9-9c-1.5-3.5 1-7 4.5-7C10 4 12 7 12 7s2-3 4.5-3C20 4 22.5 7.5 21 11c-2 4.5-9 9-9 9z',
  ],
  phone: [
    'M5 4h4l2 5-2.5 1.5c1 2.5 3 4.5 5.5 5.5L16 14l4 2v3a2 2 0 01-2 2C9.5 20.5 3.5 14.5 3 6a2 2 0 012-2z',
  ],
  search: [
    'M11 4a7 7 0 105.2 11.7L21 21',
    'M11 4a7 7 0 100 14 7 7 0 000-14z',
  ],
};

export default function EmptyIcon({
  name,
  size = 44,
  color = '#94A3B8',
  className,
}: {
  name: keyof typeof PATHS | string;
  size?: number;
  color?: string;
  className?: string;
}) {
  const paths = PATHS[name as string] || PATHS.document;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {paths.map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
}
