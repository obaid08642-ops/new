export function PremiumHealthIllustration() {
  return <svg aria-hidden="true" className="premium-health-illustration" viewBox="0 0 420 360" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="nabdPulseGradient" x1="74" y1="54" x2="344" y2="302" gradientUnits="userSpaceOnUse"><stop stopColor="#B9F0F6" /><stop offset="1" stopColor="#1A9FB6" /></linearGradient>
      <filter id="nabdSoftShadow" x="20" y="18" width="380" height="330" filterUnits="userSpaceOnUse"><feGaussianBlur stdDeviation="12" /></filter>
    </defs>
    <ellipse cx="214" cy="188" rx="149" ry="126" fill="#23B5CE" fillOpacity=".07" />
    <path d="M104 182H147L166 143L190 225L217 165L236 191H315" stroke="url(#nabdPulseGradient)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="12" />
    <path d="M104 182H147L166 143L190 225L217 165L236 191H315" filter="url(#nabdSoftShadow)" stroke="#23B5CE" strokeLinecap="round" strokeLinejoin="round" strokeOpacity=".36" strokeWidth="13" />
    <circle cx="93" cy="102" r="28" fill="#fff" /><path d="M93 87V117M78 102H108" stroke="#1A9FB6" strokeLinecap="round" strokeWidth="7" />
    <circle cx="318" cy="246" r="35" fill="#fff" /><path d="M305 246L315 256L334 235" stroke="#1A9FB6" strokeLinecap="round" strokeLinejoin="round" strokeWidth="7" />
    <circle cx="291" cy="85" r="13" fill="#F6B94E" /><circle cx="135" cy="282" r="9" fill="#7A6BEA" />
  </svg>;
}
