import React from 'react';
import Svg, { Path, Rect, Circle, Defs, LinearGradient, Stop, G } from 'react-native-svg';

interface IconProps {
  size?: number;
}

export function VectorCatAll({ size = 36 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <Defs>
        <LinearGradient id="cat_all_bg" x1="10" y1="10" x2="54" y2="54" gradientUnits="userSpaceOnUse">
          <Stop stopColor="#00E599" />
          <Stop offset="1" stopColor="#0B1527" />
        </LinearGradient>
      </Defs>
      <Rect x="8" y="8" width="48" height="48" rx="16" fill="url(#cat_all_bg)" />
      <Circle cx="24" cy="24" r="5" fill="#FFFFFF" fillOpacity={0.9} />
      <Circle cx="40" cy="24" r="5" fill="#5FD9B3" />
      <Circle cx="24" cy="40" r="5" fill="#5FD9B3" />
      <Circle cx="40" cy="40" r="5" fill="#FFFFFF" fillOpacity={0.9} />
      <Path d="M24 24L40 40M40 24L24 40" stroke="#FFFFFF" strokeWidth="2" strokeDasharray="2 2" strokeOpacity={0.4} />
    </Svg>
  );
}

export function VectorCatMeds({ size = 36 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <Defs>
        <LinearGradient id="pharm_body" x1="16" y1="20" x2="48" y2="56" gradientUnits="userSpaceOnUse">
          <Stop stopColor="#5FD9B3" />
          <Stop offset="1" stopColor="#00876F" />
        </LinearGradient>
        <LinearGradient id="pharm_cap" x1="22" y1="10" x2="42" y2="18" gradientUnits="userSpaceOnUse">
          <Stop stopColor="#B8E030" />
          <Stop offset="1" stopColor="#7CB518" />
        </LinearGradient>
      </Defs>
      <G>
        <Rect x="22" y="10" width="20" height="8" rx="4" fill="url(#pharm_cap)" />
        <Rect x="16" y="18" width="32" height="38" rx="10" fill="url(#pharm_body)" />
        <Rect x="20" y="26" width="24" height="22" rx="6" fill="#FFFFFF" fillOpacity={0.9} />
        <Path d="M32 30V44M25 37H39" stroke="#00876F" strokeWidth="3" strokeLinecap="round" />
        <Rect x="40" y="42" width="16" height="8" rx="4" transform="rotate(-30 40 42)" fill="#B8E030" />
        <Path d="M40 42L48 37.38" stroke="#FFFFFF" strokeWidth="1.5" />
      </G>
    </Svg>
  );
}

export function VectorCatHairCare({ size = 36 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <Defs>
        <LinearGradient id="cat_hair_bg" x1="16" y1="16" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <Stop stopColor="#EC4899" />
          <Stop offset="1" stopColor="#9333EA" />
        </LinearGradient>
      </Defs>
      <Rect x="8" y="8" width="48" height="48" rx="16" fill="#FCE7F3" />
      <Rect x="24" y="24" width="16" height="26" rx="6" fill="url(#cat_hair_bg)" />
      <Rect x="28" y="16" width="8" height="8" rx="2" fill="#9333EA" />
      <Path d="M30 16V12H34V16" stroke="#EC4899" strokeWidth="2" strokeLinecap="round" />
      <Path d="M42 20C47 24 47 34 44 42C48 36 49 28 46 22" stroke="#F472B6" strokeWidth="2.5" strokeLinecap="round" />
      <Circle cx="20" cy="22" r="2" fill="#F472B6" />
      <Path d="M28 32H36" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

export function VectorCatCosmetics({ size = 36 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <Defs>
        <LinearGradient id="cat_cosmetic_lip" x1="26" y1="14" x2="38" y2="36" gradientUnits="userSpaceOnUse">
          <Stop stopColor="#F43F5E" />
          <Stop offset="1" stopColor="#E11D48" />
        </LinearGradient>
      </Defs>
      <Rect x="8" y="8" width="48" height="48" rx="16" fill="#FFE4E6" />
      <Rect x="25" y="32" width="14" height="20" rx="3" fill="#1E293B" />
      <Rect x="27" y="26" width="10" height="6" fill="#E2E8F0" />
      <Path d="M28 26V18C28 18 31 14 34 16C36 17 36 26 36 26H28Z" fill="url(#cat_cosmetic_lip)" />
      <Path d="M42 46L49 39" stroke="#E2E8F0" strokeWidth="3" strokeLinecap="round" />
      <Path d="M49 39C52 36 53 31 51 29C49 27 44 28 41 31" fill="#FDA4AF" />
      <Circle cx="18" cy="28" r="2.5" fill="#FB7185" />
    </Svg>
  );
}

export function VectorCatSkinCare({ size = 36 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <Defs>
        <LinearGradient id="cat_skin_jar" x1="16" y1="26" x2="48" y2="52" gradientUnits="userSpaceOnUse">
          <Stop stopColor="#06B6D4" />
          <Stop offset="1" stopColor="#0891B2" />
        </LinearGradient>
      </Defs>
      <Rect x="8" y="8" width="48" height="48" rx="16" fill="#CFFAFE" />
      <Rect x="18" y="30" width="28" height="20" rx="6" fill="url(#cat_skin_jar)" />
      <Rect x="16" y="24" width="32" height="7" rx="3.5" fill="#38BDF8" />
      <Path d="M32 12C32 12 37 18 37 20C37 22.76 34.76 25 32 25C29.24 25 27 22.76 27 20C27 18 32 12 32 12Z" fill="#38BDF8" />
      <Path d="M42 16C46 16 48 20 46 23C44 23 42 20 42 16Z" fill="#10B981" />
    </Svg>
  );
}

export function VectorCatBabyCare({ size = 36 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <Defs>
        <LinearGradient id="cat_baby_bot" x1="22" y1="18" x2="42" y2="52" gradientUnits="userSpaceOnUse">
          <Stop stopColor="#38BDF8" />
          <Stop offset="1" stopColor="#0284C7" />
        </LinearGradient>
      </Defs>
      <Rect x="8" y="8" width="48" height="48" rx="16" fill="#E0F2FE" />
      <Rect x="22" y="24" width="20" height="26" rx="5" fill="url(#cat_baby_bot)" />
      <Rect x="25" y="19" width="14" height="5" rx="2" fill="#FBBF24" />
      <Path d="M30 19V14C30 12.5 34 12.5 34 14V19" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" />
      <Path d="M32 30H38M32 36H38M32 42H36" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
      <Path d="M16 26C14 24 14 21 16 19C18 17 21 19 22 21C23 19 26 17 28 19C30 21 30 24 28 26L22 32L16 26Z" fill="#F43F5E" />
    </Svg>
  );
}

export function VectorCatVitamins({ size = 36 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <Defs>
        <LinearGradient id="cat_vit_orange" x1="16" y1="16" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <Stop stopColor="#F59E0B" />
          <Stop offset="1" stopColor="#D97706" />
        </LinearGradient>
      </Defs>
      <Rect x="8" y="8" width="48" height="48" rx="16" fill="#FEF3C7" />
      <Circle cx="32" cy="32" r="16" fill="url(#cat_vit_orange)" />
      <Circle cx="32" cy="32" r="13" fill="#FDE68A" fillOpacity={0.3} />
      <Path d="M32 20V44M20 32H44M23 23L41 41M41 23L23 41" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
      <Circle cx="44" cy="18" r="3" fill="#F59E0B" />
      <Circle cx="18" cy="42" r="2.5" fill="#FBBF24" />
      <Circle cx="32" cy="32" r="3" fill="#FFFFFF" />
    </Svg>
  );
}

export function VectorCatPersonalCare({ size = 36 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <Defs>
        <LinearGradient id="cat_pers_grad" x1="18" y1="20" x2="46" y2="52" gradientUnits="userSpaceOnUse">
          <Stop stopColor="#10B981" />
          <Stop offset="1" stopColor="#047857" />
        </LinearGradient>
      </Defs>
      <Rect x="8" y="8" width="48" height="48" rx="16" fill="#D1FAE5" />
      <Rect x="22" y="24" width="20" height="26" rx="6" fill="url(#cat_pers_grad)" />
      <Rect x="28" y="19" width="8" height="5" fill="#A7F3D0" />
      <Path d="M32 19V14H24M24 14L22 17" stroke="#10B981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx="44" cy="20" r="3.5" fill="#A7F3D0" />
      <Circle cx="48" cy="27" r="2" fill="#6EE7B7" />
      <Path d="M28 34C32 32 36 36 36 34" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

export function getCategoryVector(id: string, size = 36) {
  switch (id) {
    case 'all':
      return <VectorCatAll size={size} />;
    case 'medications':
    case 'أدوية وعلاجات':
      return <VectorCatMeds size={size} />;
    case 'hair-care':
    case 'عناية بالشعر':
      return <VectorCatHairCare size={size} />;
    case 'cosmetics':
    case 'مكياج وإكسسوارات':
      return <VectorCatCosmetics size={size} />;
    case 'skincare':
    case 'العناية بالبشرة':
      return <VectorCatSkinCare size={size} />;
    case 'baby':
    case 'الأم والطفل':
      return <VectorCatBabyCare size={size} />;
    case 'vitamins':
    case 'فيتامينات ومكملات':
      return <VectorCatVitamins size={size} />;
    case 'personal-care':
    case 'عناية شخصية':
      return <VectorCatPersonalCare size={size} />;
    default:
      return <VectorCatMeds size={size} />;
  }
}
