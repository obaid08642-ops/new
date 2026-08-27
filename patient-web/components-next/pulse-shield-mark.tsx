type Props = { decorative?: boolean };

export function PulseShieldMark({ decorative = false }: Props) {
  return <svg aria-hidden={decorative || undefined} aria-label={decorative ? undefined : "نبض بلس"} className="pulse-shield-mark" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M16 3.2 26 7.3v7.4c0 6.5-4.1 11.6-10 14.1-5.9-2.5-10-7.6-10-14.1V7.3L16 3.2Z" fill="currentColor" fillOpacity=".18" stroke="currentColor" strokeWidth="1.7" />
    <path d="M8.7 16h4l1.9-4.1 3.4 8.2 2.1-4.1h3.2" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.25" />
  </svg>;
}
