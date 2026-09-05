import React from "react";

interface IllustrationProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
  className?: string;
}

/**
 * 1. Pharmacy / Prescription Medicine 3D Vector Illustration
 */
export function VectorPharmacy({ size = 48, className, ...props }: IllustrationProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <defs>
        <linearGradient id="pharmacy_bottle_body" x1="16" y1="20" x2="48" y2="56" gradientUnits="userSpaceOnUse">
          <stop stopColor="#5FD9B3" />
          <stop offset="1" stopColor="#00876F" />
        </linearGradient>
        <linearGradient id="pharmacy_bottle_cap" x1="22" y1="10" x2="42" y2="18" gradientUnits="userSpaceOnUse">
          <stop stopColor="#B8E030" />
          <stop offset="1" stopColor="#7CB518" />
        </linearGradient>
      </defs>
      <g>
        <rect x="22" y="10" width="20" height="8" rx="4" fill="url(#pharmacy_bottle_cap)" />
        <rect x="16" y="18" width="32" height="38" rx="10" fill="url(#pharmacy_bottle_body)" />
        <rect x="20" y="26" width="24" height="22" rx="6" fill="#FFFFFF" fillOpacity="0.9" />
        <path d="M32 30V44M25 37H39" stroke="#00876F" strokeWidth="3" strokeLinecap="round" />
        <rect x="40" y="42" width="16" height="8" rx="4" transform="rotate(-30 40 42)" fill="#B8E030" />
        <path d="M40 42L48 37.38" stroke="#FFFFFF" strokeWidth="1.5" />
      </g>
    </svg>
  );
}

/**
 * 2. Doctors & Telehealth Consultations 3D Vector Illustration
 */
export function VectorDoctor({ size = 48, className, ...props }: IllustrationProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <defs>
        <linearGradient id="stethoscope_grad" x1="14" y1="12" x2="50" y2="52" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4FA8E0" />
          <stop offset="1" stopColor="#1D4ED8" />
        </linearGradient>
        <linearGradient id="chestpiece_grad" x1="42" y1="36" x2="54" y2="48" gradientUnits="userSpaceOnUse">
          <stop stopColor="#B8E030" />
          <stop offset="1" stopColor="#7CB518" />
        </linearGradient>
      </defs>
      <path
        d="M20 12V26C20 32.6274 25.3726 38 32 38C38.6274 38 44 32.6274 44 26V12"
        stroke="url(#stethoscope_grad)"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path d="M16 12H24M40 12H48" stroke="#16213A" strokeWidth="4" strokeLinecap="round" />
      <path
        d="M32 38V44C32 47.3137 34.6863 50 38 50H44"
        stroke="url(#stethoscope_grad)"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <circle cx="48" cy="50" r="7" fill="url(#chestpiece_grad)" />
      <circle cx="48" cy="50" r="3" fill="#FFFFFF" />
    </svg>
  );
}

/**
 * 3. Laboratory & Diagnostic Tests 3D Vector Illustration
 */
export function VectorLabs({ size = 48, className, ...props }: IllustrationProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <defs>
        <linearGradient id="tube_liquid" x1="20" y1="30" x2="38" y2="54" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFC93C" />
          <stop offset="1" stopColor="#F59E0B" />
        </linearGradient>
        <linearGradient id="tube_glass" x1="18" y1="12" x2="42" y2="56" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFFFFF" stopOpacity="0.8" />
          <stop offset="1" stopColor="#5FD9B3" stopOpacity="0.3" />
        </linearGradient>
      </defs>
      <rect x="22" y="10" width="20" height="4" rx="2" fill="#16213A" />
      <path
        d="M24 14V44C24 48.4183 27.5817 52 32 52C36.4183 52 40 48.4183 40 44V14H24Z"
        fill="url(#tube_glass)"
        stroke="#16213A"
        strokeWidth="2.5"
      />
      <path
        d="M25 32C28 30 36 34 39 32V44C39 47.866 35.866 51 32 51C28.134 51 25 47.866 25 44V32Z"
        fill="url(#tube_liquid)"
      />
      <circle cx="30" cy="38" r="2" fill="#FFFFFF" fillOpacity="0.8" />
      <circle cx="34" cy="44" r="1.5" fill="#FFFFFF" fillOpacity="0.8" />
    </svg>
  );
}

/**
 * 4. Home Nursing Care 3D Vector Illustration
 */
export function VectorNursing({ size = 48, className, ...props }: IllustrationProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <defs>
        <linearGradient id="nursing_heart" x1="16" y1="16" x2="48" y2="50" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FF4D5A" />
          <stop offset="1" stopColor="#E11D48" />
        </linearGradient>
      </defs>
      <path
        d="M32 54S14 42 14 26C14 18 20 12 28 12C32 12 30 16 32 18C34 16 32 12 36 12C44 12 50 18 50 26C50 42 32 54 32 54Z"
        fill="url(#nursing_heart)"
      />
      <rect x="29" y="24" width="6" height="18" rx="2" fill="#FFFFFF" />
      <rect x="23" y="30" width="18" height="6" rx="2" fill="#FFFFFF" />
    </svg>
  );
}

/**
 * 5. Radiology & Imaging 3D Vector Illustration
 */
export function VectorRadiology({ size = 48, className, ...props }: IllustrationProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <defs>
        <linearGradient id="radio_grad" x1="14" y1="14" x2="50" y2="50" gradientUnits="userSpaceOnUse">
          <stop stopColor="#8B5CF6" />
          <stop offset="1" stopColor="#6D28D9" />
        </linearGradient>
      </defs>
      <rect x="14" y="14" width="36" height="36" rx="10" fill="url(#radio_grad)" />
      <path
        d="M20 32H27L30 22L35 42L38 32H44"
        stroke="#B8E030"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="32" cy="18" r="2" fill="#5FD9B3" />
    </svg>
  );
}

/**
 * 6. AI Smart Triage 3D Vector Illustration
 */
export function VectorAI({ size = 48, className, ...props }: IllustrationProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <defs>
        <linearGradient id="ai_sparkle" x1="12" y1="12" x2="52" y2="52" gradientUnits="userSpaceOnUse">
          <stop stopColor="#5FD9B3" />
          <stop offset="0.5" stopColor="#B8E030" />
          <stop offset="1" stopColor="#00876F" />
        </linearGradient>
      </defs>
      <path
        d="M32 10L36.5 24.5L51 29L36.5 33.5L32 48L27.5 33.5L13 29L27.5 24.5L32 10Z"
        fill="url(#ai_sparkle)"
      />
      <circle cx="46" cy="18" r="3" fill="#B8E030" />
      <circle cx="18" cy="42" r="2.5" fill="#5FD9B3" />
    </svg>
  );
}

/**
 * 7. Map & Healthcare Facilities 3D Vector Illustration
 */
export function VectorMap({ size = 48, className, ...props }: IllustrationProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <defs>
        <linearGradient id="pin_grad" x1="16" y1="10" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4FA8E0" />
          <stop offset="1" stopColor="#0284C7" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="52" r="12" fill="#16213A" fillOpacity="0.1" />
      <path
        d="M32 12C23.1634 12 16 19.1634 16 28C16 39 32 52 32 52C32 52 48 39 48 28C48 19.1634 40.8366 12 32 12Z"
        fill="url(#pin_grad)"
      />
      <circle cx="32" cy="28" r="7" fill="#FFFFFF" />
      <path d="M32 25V31M29 28H35" stroke="#0284C7" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/**
 * 8. Emergency & Ambulance 3D Vector Illustration
 */
export function VectorEmergency({ size = 48, className, ...props }: IllustrationProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <defs>
        <linearGradient id="emerg_grad" x1="12" y1="16" x2="52" y2="48" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FF4D5A" />
          <stop offset="1" stopColor="#DC2626" />
        </linearGradient>
      </defs>
      <path
        d="M32 10L50 18V32C50 43 42 51 32 54C22 51 14 43 14 32V18L32 10Z"
        fill="url(#emerg_grad)"
      />
      <path d="M32 22V36M32 42V44" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

/**
 * 9. Vitals & Biometric Tracking 3D Vector Illustration
 */
export function VectorVitals({ size = 48, className, ...props }: IllustrationProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <defs>
        <linearGradient id="vitals_bg" x1="12" y1="12" x2="52" y2="52" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0EA5E9" />
          <stop offset="1" stopColor="#0284C7" />
        </linearGradient>
        <linearGradient id="vitals_pulse" x1="16" y1="32" x2="48" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#B8E030" />
          <stop offset="1" stopColor="#5FD9B3" />
        </linearGradient>
      </defs>
      <rect x="12" y="14" width="40" height="36" rx="12" fill="url(#vitals_bg)" />
      <path
        d="M16 32H24L28 22L33 42L37 28L40 34H48"
        stroke="url(#vitals_pulse)"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="48" cy="18" r="3" fill="#B8E030" />
      <circle cx="16" cy="46" r="2" fill="#5FD9B3" />
    </svg>
  );
}

/**
 * 10. Health Records & Secure Medical Shield 3D Vector Illustration
 */
export function VectorHealthShield({ size = 48, className, ...props }: IllustrationProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <defs>
        <linearGradient id="shield_main" x1="14" y1="10" x2="50" y2="54" gradientUnits="userSpaceOnUse">
          <stop stopColor="#5FD9B3" />
          <stop offset="0.6" stopColor="#00876F" />
          <stop offset="1" stopColor="#16213A" />
        </linearGradient>
        <linearGradient id="shield_accent" x1="24" y1="20" x2="40" y2="36" gradientUnits="userSpaceOnUse">
          <stop stopColor="#B8E030" />
          <stop offset="1" stopColor="#7CB518" />
        </linearGradient>
      </defs>
      <path
        d="M32 10L48 17V33C48 43 41 51 32 54C23 51 16 43 16 33V17L32 10Z"
        fill="url(#shield_main)"
      />
      <circle cx="32" cy="32" r="12" fill="#FFFFFF" fillOpacity="0.95" />
      <path d="M32 26V38M26 32H38" stroke="url(#shield_accent)" strokeWidth="3.5" strokeLinecap="round" />
    </svg>
  );
}

/**
 * 11. Maternity & Mother-Child Care 3D Vector Illustration
 */
export function VectorMaternity({ size = 48, className, ...props }: IllustrationProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <defs>
        <linearGradient id="mat_halo" x1="16" y1="12" x2="48" y2="52" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F472B6" />
          <stop offset="0.6" stopColor="#EC4899" />
          <stop offset="1" stopColor="#BE185D" />
        </linearGradient>
        <linearGradient id="mat_heart" x1="24" y1="22" x2="40" y2="38" gradientUnits="userSpaceOnUse">
          <stop stopColor="#5FD9B3" />
          <stop offset="1" stopColor="#00876F" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="22" fill="url(#mat_halo)" fillOpacity="0.15" />
      <path
        d="M32 48C32 48 18 38 18 26C18 19.5 23 15 29 15C32.5 15 35 17 36 19C37 17 39.5 15 43 15C49 15 54 19.5 54 26C54 38 40 48 40 48L36 51L32 48Z"
        fill="url(#mat_halo)"
      />
      <circle cx="36" cy="27" r="5" fill="#FFFFFF" />
      <circle cx="36" cy="37" r="3" fill="#B8E030" />
      <path d="M30 40C30 35 34 33 38 33" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/**
 * 12. Mental Health & Mindfulness 3D Vector Illustration
 */
export function VectorMentalHealth({ size = 48, className, ...props }: IllustrationProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <defs>
        <linearGradient id="mind_grad" x1="14" y1="12" x2="50" y2="52" gradientUnits="userSpaceOnUse">
          <stop stopColor="#818CF8" />
          <stop offset="0.6" stopColor="#6366F1" />
          <stop offset="1" stopColor="#4338CA" />
        </linearGradient>
        <linearGradient id="mind_spark" x1="26" y1="18" x2="38" y2="30" gradientUnits="userSpaceOnUse">
          <stop stopColor="#5FD9B3" />
          <stop offset="1" stopColor="#B8E030" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="22" fill="url(#mind_grad)" fillOpacity="0.16" />
      <path
        d="M26 18C21.5817 18 18 21.5817 18 26C18 29.5 20.2 32.5 23.4 33.6C23.8 35.8 25.2 39 28 41V46H36V41C38.8 39 40.2 35.8 40.6 33.6C43.8 32.5 46 29.5 46 26C46 21.5817 42.4183 18 38 18C36.2 18 34.6 18.6 33.2 19.6C32.8 19.3 32.4 19 32 19C31.6 19 31.2 19.3 30.8 19.6C29.4 18.6 27.8 18 26 18Z"
        fill="url(#mind_grad)"
      />
      <circle cx="32" cy="27" r="4" fill="url(#mind_spark)" />
      <path d="M28 49H36M30 52H34" stroke="#B8E030" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

/**
 * 13. Nutrition & Dietetics 3D Vector Illustration
 */
export function VectorNutrition({ size = 48, className, ...props }: IllustrationProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <defs>
        <linearGradient id="nutr_bowl" x1="14" y1="26" x2="50" y2="52" gradientUnits="userSpaceOnUse">
          <stop stopColor="#10B981" />
          <stop offset="0.6" stopColor="#059669" />
          <stop offset="1" stopColor="#047857" />
        </linearGradient>
        <linearGradient id="nutr_avocado" x1="22" y1="12" x2="42" y2="34" gradientUnits="userSpaceOnUse">
          <stop stopColor="#B8E030" />
          <stop offset="1" stopColor="#84CC16" />
        </linearGradient>
      </defs>
      <path
        d="M14 30C14 41 22 50 32 50C42 50 50 41 50 30H14Z"
        fill="url(#nutr_bowl)"
      />
      <circle cx="32" cy="24" r="12" fill="url(#nutr_avocado)" />
      <circle cx="32" cy="25" r="5" fill="#16213A" fillOpacity="0.8" />
      <path d="M24 20C24 16 28 12 32 12C36 12 40 16 40 20" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
      <path d="M46 16L40 26" stroke="#5FD9B3" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/**
 * 14. Health Insurance & Policy 3D Vector Illustration
 */
export function VectorInsurance({ size = 48, className, ...props }: IllustrationProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <defs>
        <linearGradient id="ins_card" x1="10" y1="14" x2="54" y2="50" gradientUnits="userSpaceOnUse">
          <stop stopColor="#16213A" />
          <stop offset="0.6" stopColor="#1E293B" />
          <stop offset="1" stopColor="#0F172A" />
        </linearGradient>
        <linearGradient id="ins_chip" x1="18" y1="26" x2="28" y2="36" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FCD34D" />
          <stop offset="1" stopColor="#F59E0B" />
        </linearGradient>
        <linearGradient id="ins_check" x1="38" y1="34" x2="50" y2="46" gradientUnits="userSpaceOnUse">
          <stop stopColor="#5FD9B3" />
          <stop offset="1" stopColor="#B8E030" />
        </linearGradient>
      </defs>
      <rect x="10" y="14" width="44" height="36" rx="8" fill="url(#ins_card)" stroke="rgba(95,217,179,0.3)" strokeWidth="1.5" />
      <rect x="16" y="24" width="12" height="10" rx="3" fill="url(#ins_chip)" />
      <path d="M16 28H28M22 24V34" stroke="#B45309" strokeWidth="1" />
      <circle cx="44" cy="38" r="9" fill="url(#ins_check)" />
      <path d="M40 38L43 41L49 35" stroke="#16213A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="16" y="40" width="16" height="3" rx="1.5" fill="#FFFFFF" fillOpacity="0.4" />
    </svg>
  );
}

/**
 * 15. Family & Multi-Profile 3D Vector Illustration
 */
export function VectorFamily({ size = 48, className, ...props }: IllustrationProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <defs>
        <linearGradient id="fam_heart" x1="16" y1="16" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop stopColor="#EC4899" />
          <stop offset="0.6" stopColor="#F43F5E" />
          <stop offset="1" stopColor="#E11D48" />
        </linearGradient>
        <linearGradient id="fam_person" x1="20" y1="20" x2="44" y2="44" gradientUnits="userSpaceOnUse">
          <stop stopColor="#5FD9B3" />
          <stop offset="1" stopColor="#00876F" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="22" fill="rgba(236,72,153,0.1)" />
      {/* Parent 1 */}
      <circle cx="24" cy="24" r="5" fill="url(#fam_person)" />
      <path d="M16 40C16 35 20 33 24 33C28 33 32 35 32 40" stroke="url(#fam_person)" strokeWidth="3" strokeLinecap="round" />
      {/* Parent 2 */}
      <circle cx="40" cy="24" r="5" fill="url(#fam_heart)" />
      <path d="M32 40C32 35 36 33 40 33C44 33 48 35 48 40" stroke="url(#fam_heart)" strokeWidth="3" strokeLinecap="round" />
      {/* Child in center */}
      <circle cx="32" cy="36" r="3.5" fill="#B8E030" />
      <path d="M26 48C26 44 29 43 32 43C35 43 38 44 38 48" stroke="#B8E030" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

/**
 * 16. Loyalty, Rewards & Gamification 3D Vector Illustration
 */
export function VectorLoyalty({ size = 48, className, ...props }: IllustrationProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <defs>
        <linearGradient id="loyal_gold" x1="14" y1="12" x2="50" y2="48" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FBBF24" />
          <stop offset="0.5" stopColor="#F59E0B" />
          <stop offset="1" stopColor="#D97706" />
        </linearGradient>
        <linearGradient id="loyal_ribbon" x1="20" y1="36" x2="44" y2="58" gradientUnits="userSpaceOnUse">
          <stop stopColor="#5FD9B3" />
          <stop offset="1" stopColor="#087F8C" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="26" fill="rgba(245,158,11,0.12)" />
      {/* Ribbons */}
      <path d="M24 38L20 54L28 50L32 54L30 38" fill="url(#loyal_ribbon)" />
      <path d="M40 38L44 54L36 50L32 54L34 38" fill="url(#loyal_ribbon)" />
      {/* Medal Core */}
      <circle cx="32" cy="28" r="16" fill="url(#loyal_gold)" filter="drop-shadow(0 4px 6px rgba(217,119,6,0.25))" />
      <circle cx="32" cy="28" r="13" fill="#FFFBEB" fillOpacity="0.3" />
      {/* Star In Center */}
      <path
        d="M32 18L35 24L41 25L36.5 29L38 35L32 32L26 35L27.5 29L23 25L29 24L32 18Z"
        fill="#FFFFFF"
      />
      {/* Sparkles */}
      <circle cx="16" cy="18" r="2" fill="#FBBF24" />
      <circle cx="48" cy="16" r="2.5" fill="#FBBF24" />
      <circle cx="50" cy="38" r="1.5" fill="#FBBF24" />
    </svg>
  );
}

/**
 * 17. Orders, Deliveries & Pharmacy Fulfillment 3D Vector Illustration
 */
export function VectorOrders({ size = 48, className, ...props }: IllustrationProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <defs>
        <linearGradient id="order_box" x1="16" y1="18" x2="48" y2="50" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F1F5F9" />
          <stop offset="0.6" stopColor="#E2E8F0" />
          <stop offset="1" stopColor="#CBD5E1" />
        </linearGradient>
        <linearGradient id="order_accent" x1="20" y1="16" x2="44" y2="44" gradientUnits="userSpaceOnUse">
          <stop stopColor="#5FD9B3" />
          <stop offset="1" stopColor="#087F8C" />
        </linearGradient>
      </defs>
      <rect x="8" y="8" width="48" height="48" rx="16" fill="rgba(8,127,140,0.08)" />
      {/* Isometric Box */}
      {/* Top flap */}
      <path d="M32 14L48 22L32 30L16 22L32 14Z" fill="url(#order_box)" />
      {/* Left face */}
      <path d="M16 22L32 30V48L16 40V22Z" fill="#CBD5E1" />
      {/* Right face */}
      <path d="M32 30L48 22V40L32 48V30Z" fill="#94A3B8" />
      {/* Tape / Seal */}
      <path d="M28 16L36 20L36 32L28 28V16Z" fill="url(#order_accent)" />
      {/* Check badge */}
      <circle cx="44" cy="42" r="9" fill="#00876F" />
      <path d="M40 42L43 45L48 39" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * 18. Support, Customer Care & Helpdesk 3D Vector Illustration
 */
export function VectorSupport({ size = 48, className, ...props }: IllustrationProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <defs>
        <linearGradient id="support_head" x1="16" y1="16" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop stopColor="#5FD9B3" />
          <stop offset="1" stopColor="#087F8C" />
        </linearGradient>
        <linearGradient id="support_bubble" x1="22" y1="20" x2="42" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0F172A" />
          <stop offset="1" stopColor="#334155" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="26" fill="rgba(95,217,179,0.15)" />
      {/* Headset Arc */}
      <path
        d="M18 32C18 24.268 24.268 18 32 18C39.732 18 46 24.268 46 32V36"
        stroke="url(#support_head)"
        strokeWidth="4"
        strokeLinecap="round"
      />
      {/* Ear Cups */}
      <rect x="14" y="29" width="6" height="12" rx="3" fill="url(#support_head)" />
      <rect x="44" y="29" width="6" height="12" rx="3" fill="url(#support_head)" />
      {/* Mic arm */}
      <path d="M46 38C46 43 41 46 36 46H34" stroke="url(#support_head)" strokeWidth="3" strokeLinecap="round" />
      <circle cx="33" cy="46" r="2.5" fill="#087F8C" />
      {/* Speech bubble in center */}
      <rect x="24" y="25" width="16" height="12" rx="4" fill="url(#support_bubble)" />
      {/* 3 pulsing dots */}
      <circle cx="28" cy="31" r="1.3" fill="#5FD9B3" />
      <circle cx="32" cy="31" r="1.3" fill="#5FD9B3" />
      <circle cx="36" cy="31" r="1.3" fill="#5FD9B3" />
    </svg>
  );
}

/**
 * Pharmacy Category Vector Illustrations
 */
export function VectorCatMeds({ size = 48, className, ...props }: IllustrationProps) {
  return <VectorPharmacy size={size} className={className} {...props} />;
}

export function VectorCatAll({ size = 48, className, ...props }: IllustrationProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
      <defs>
        <linearGradient id="cat_all_bg" x1="10" y1="10" x2="54" y2="54" gradientUnits="userSpaceOnUse">
          <stop stopColor="#00E599" />
          <stop offset="1" stopColor="#0B1527" />
        </linearGradient>
      </defs>
      <rect x="8" y="8" width="48" height="48" rx="16" fill="url(#cat_all_bg)" />
      <circle cx="24" cy="24" r="5" fill="#FFFFFF" fillOpacity="0.9" />
      <circle cx="40" cy="24" r="5" fill="#5FD9B3" />
      <circle cx="24" cy="40" r="5" fill="#5FD9B3" />
      <circle cx="40" cy="40" r="5" fill="#FFFFFF" fillOpacity="0.9" />
      <path d="M24 24L40 40M40 24L24 40" stroke="#FFFFFF" strokeWidth="2" strokeDasharray="2 2" strokeOpacity="0.4" />
    </svg>
  );
}

export function VectorCatHairCare({ size = 48, className, ...props }: IllustrationProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
      <defs>
        <linearGradient id="cat_hair_bg" x1="16" y1="16" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop stopColor="#EC4899" />
          <stop offset="1" stopColor="#9333EA" />
        </linearGradient>
      </defs>
      <rect x="8" y="8" width="48" height="48" rx="16" fill="rgba(236,72,153,0.12)" />
      <rect x="24" y="24" width="16" height="26" rx="6" fill="url(#cat_hair_bg)" />
      <rect x="28" y="16" width="8" height="8" rx="2" fill="#9333EA" />
      <path d="M30 16V12H34V16" stroke="#EC4899" strokeWidth="2" strokeLinecap="round" />
      <path d="M42 20C47 24 47 34 44 42C48 36 49 28 46 22" stroke="#F472B6" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="20" cy="22" r="2" fill="#F472B6" />
      <path d="M28 32H36" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function VectorCatCosmetics({ size = 48, className, ...props }: IllustrationProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
      <defs>
        <linearGradient id="cat_cosmetic_lip" x1="26" y1="14" x2="38" y2="36" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F43F5E" />
          <stop offset="1" stopColor="#E11D48" />
        </linearGradient>
      </defs>
      <rect x="8" y="8" width="48" height="48" rx="16" fill="rgba(244,63,94,0.12)" />
      <rect x="25" y="32" width="14" height="20" rx="3" fill="#1E293B" />
      <rect x="27" y="26" width="10" height="6" fill="#E2E8F0" />
      <path d="M28 26V18C28 18 31 14 34 16C36 17 36 26 36 26H28Z" fill="url(#cat_cosmetic_lip)" />
      <path d="M42 46L49 39" stroke="#E2E8F0" strokeWidth="3" strokeLinecap="round" />
      <path d="M49 39C52 36 53 31 51 29C49 27 44 28 41 31" fill="#FDA4AF" />
      <circle cx="18" cy="28" r="2.5" fill="#FB7185" />
    </svg>
  );
}

export function VectorCatSkinCare({ size = 48, className, ...props }: IllustrationProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
      <defs>
        <linearGradient id="cat_skin_jar" x1="16" y1="26" x2="48" y2="52" gradientUnits="userSpaceOnUse">
          <stop stopColor="#06B6D4" />
          <stop offset="1" stopColor="#0891B2" />
        </linearGradient>
      </defs>
      <rect x="8" y="8" width="48" height="48" rx="16" fill="rgba(6,182,212,0.12)" />
      <rect x="18" y="30" width="28" height="20" rx="6" fill="url(#cat_skin_jar)" />
      <rect x="16" y="24" width="32" height="7" rx="3.5" fill="#38BDF8" />
      <path d="M32 12C32 12 37 18 37 20C37 22.76 34.76 25 32 25C29.24 25 27 22.76 27 20C27 18 32 12 32 12Z" fill="#38BDF8" />
      <path d="M42 16C46 16 48 20 46 23C44 23 42 20 42 16Z" fill="#10B981" />
    </svg>
  );
}

export function VectorCatBabyCare({ size = 48, className, ...props }: IllustrationProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
      <defs>
        <linearGradient id="cat_baby_bot" x1="22" y1="18" x2="42" y2="52" gradientUnits="userSpaceOnUse">
          <stop stopColor="#38BDF8" />
          <stop offset="1" stopColor="#0284C7" />
        </linearGradient>
      </defs>
      <rect x="8" y="8" width="48" height="48" rx="16" fill="rgba(56,189,248,0.12)" />
      <rect x="22" y="24" width="20" height="26" rx="5" fill="url(#cat_baby_bot)" />
      <rect x="25" y="19" width="14" height="5" rx="2" fill="#FBBF24" />
      <path d="M30 19V14C30 12.5 34 12.5 34 14V19" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M32 30H38M32 36H38M32 42H36" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
      <path d="M16 26C14 24 14 21 16 19C18 17 21 19 22 21C23 19 26 17 28 19C30 21 30 24 28 26L22 32L16 26Z" fill="#F43F5E" />
    </svg>
  );
}

export function VectorCatVitamins({ size = 48, className, ...props }: IllustrationProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
      <defs>
        <linearGradient id="cat_vit_orange" x1="16" y1="16" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F59E0B" />
          <stop offset="1" stopColor="#D97706" />
        </linearGradient>
      </defs>
      <rect x="8" y="8" width="48" height="48" rx="16" fill="rgba(245,158,11,0.12)" />
      <circle cx="32" cy="32" r="16" fill="url(#cat_vit_orange)" />
      <circle cx="32" cy="32" r="13" fill="#FDE68A" fillOpacity="0.3" />
      <path d="M32 20V44M20 32H44M23 23L41 41M41 23L23 41" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="44" cy="18" r="3" fill="#F59E0B" />
      <circle cx="18" cy="42" r="2.5" fill="#FBBF24" />
      <circle cx="32" cy="32" r="3" fill="#FFFFFF" />
    </svg>
  );
}

export function VectorCatPersonalCare({ size = 48, className, ...props }: IllustrationProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
      <defs>
        <linearGradient id="cat_pers_grad" x1="18" y1="20" x2="46" y2="52" gradientUnits="userSpaceOnUse">
          <stop stopColor="#10B981" />
          <stop offset="1" stopColor="#047857" />
        </linearGradient>
      </defs>
      <rect x="8" y="8" width="48" height="48" rx="16" fill="rgba(16,185,129,0.12)" />
      <rect x="22" y="24" width="20" height="26" rx="6" fill="url(#cat_pers_grad)" />
      <rect x="28" y="19" width="8" height="5" fill="#A7F3D0" />
      <path d="M32 19V14H24M24 14L22 17" stroke="#10B981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="44" cy="20" r="3.5" fill="#A7F3D0" />
      <circle cx="48" cy="27" r="2" fill="#6EE7B7" />
      <path d="M28 34C32 32 36 36 36 34" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
