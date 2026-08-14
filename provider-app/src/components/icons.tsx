/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║ NABDAH PLUS — PREMIUM VECTOR ICON SYSTEM ║
 * ║ SVG-based icons using react-native-svg ║
 * ║ Clean medical UI — NO emoji anywhere ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Usage:
 * import { I } from '../components/icons';
 * <I name="lab" size={24} color="#4CAF50" />
 * <IBg name="heart" size={20} color="#F44336" />
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, Circle, Rect, Line, Polyline, G } from 'react-native-svg';
import { useTheme } from '../context';

interface IconProps {
 name: string;
 size?: number;
 color?: string;
 strokeWidth?: number;
}

// ─── SVG Path Data (Lucide-inspired, stroke-based, 24x24 viewBox) ─────────
const PATHS: Record<string, string[]> = {
 // Navigation
 home: ['M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z','M9 22V12h6v10'],
 calendar: ['M19 4H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2z','M16 2v4','M8 2v4','M3 10h18'],
 chat: ['M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z'],
 wallet: ['M21 18V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2h14a2 2 0 002-2z','M21 12h-5a2 2 0 000 4h5'],
 settings: ['M12 15a3 3 0 100-6 3 3 0 000 6z','M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9c.26.604.852.997 1.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z'],
 bell: ['M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9','M13.73 21a2 2 0 01-3.46 0'],
 search: ['M11 19a8 8 0 100-16 8 8 0 000 16z','M21 21l-4.35-4.35'],
 // Actions
 plus: ['M12 5v14','M5 12h14'],
 edit: ['M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7','M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z'],
 close: ['M18 6L6 18','M6 6l12 12'],
 check: ['M20 6L9 17l-5-5'],
 back: ['M19 12H5','M12 19l-7-7 7-7'],
 forward: ['M5 12h14','M12 5l7 7-7 7'],
 filter: ['M22 3H2l8 9.46V19l4 2v-8.54L22 3z'],
 // Status
 online: ['M12 12m-4 0a4 4 0 108 0 4 4 0 10-8 0'],
 clock: ['M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z','M12 6v6l4 2'],
 refresh: ['M23 4v6h-6','M1 20v-6h6','M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15'],
 // Medical
 heart: ['M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z'],
 stethoscope: ['M12 12a4 4 0 100-8 4 4 0 000 8z','M12 12v4','M8 16a4 4 0 008 0'],
 pill: ['M10.5 1.5l-8 8a4.95 4.95 0 007 7l8-8a4.95 4.95 0 00-7-7z','M6.5 10.5l7-7'],
 syringe: ['M18 2l4 4','M7.5 20.5L2 22l1.5-5.5','M15 4l-8.5 8.5a2.12 2.12 0 000 3l2 2a2.12 2.12 0 003 0L20 9'],
 testTube: ['M14.5 2v17.5c0 1.4-1.1 2.5-2.5 2.5S9.5 20.9 9.5 19.5V2','M8 2h8','M9.5 8h5','M9.5 12h5'],
 scan: ['M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z','M12 18c3.314 0 6-2.686 6-6s-2.686-6-6-6-6 2.686-6 6 2.686 6 6 6z','M12 14a2 2 0 100-4 2 2 0 000 4z'],
 prescription:['M4 2v20','M4 6h8a4 4 0 010 8H4','M14 14l6 8'],
 bandage: ['M18 8V6a2 2 0 00-2-2H8a2 2 0 00-2 2v2','M6 8v10a2 2 0 002 2h8a2 2 0 002-2V8','M10 12h4','M12 10v4'],
 blood: ['M12 2l-5.5 9A6.5 6.5 0 0012 22a6.5 6.5 0 005.5-11L12 2z'],
 bone: ['M18.37 4.63a3.5 3.5 0 01-4.95 4.95','M5.63 19.37a3.5 3.5 0 014.95-4.95','M8.13 8.13l7.74 7.74'],
 brain: ['M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z','M12 2v20','M2 12h20','M12 2c3 4 3 8 0 12s-3 8 0 12','M12 2c-3 4-3 8 0 12s3 8 0 12'],
 tooth: ['M12 2C9 2 7 4 7 7c0 2 .5 3 1 4.5S9 14 9 17c0 2 1 5 3 5s3-3 3-5c0-3 .5-4 1-5.5S17 9 17 7c0-3-2-5-5-5z'],
 eye: ['M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z','M12 15a3 3 0 100-6 3 3 0 000 6z'],
 ear: ['M6 8.5a6.5 6.5 0 1113 0c0 6-6 6-6 12a3.5 3.5 0 11-7 0','M15 8.5a2.5 2.5 0 00-5 0v1a2 2 0 004 0'],
 // Documents
 document: ['M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z','M14 2v6h6','M16 13H8','M16 17H8','M10 9H8'],
 upload: ['M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4','M17 8l-5-5-5 5','M12 3v12'],
 download: ['M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4','M7 10l5 5 5-5','M12 15V3'],
 camera: ['M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2v11z','M12 17a4 4 0 100-8 4 4 0 000 8z'],
 qr: ['M3 3h7v7H3V3z','M14 3h7v7h-7V3z','M3 14h7v7H3v-7z','M17 17h3v3h-3v-3z','M14 14h3v3h-3v-3z'],
 // Financial
 money: ['M12 2v20','M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6'],
 chart: ['M18 20V10','M12 20V4','M6 20v-6'],
 trendUp: ['M23 6l-9.5 9.5-5-5L1 18'],
 trendDown: ['M23 18l-9.5-9.5-5 5L1 6'],
 // Location
 pin: ['M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z','M12 13a3 3 0 100-6 3 3 0 000 6z'],
 map: ['M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4z','M8 2v16','M16 6v16'],
 delivery: ['M16 16h6v-6h-4l-2-3H1v9h3','M6 19.5A2.5 2.5 0 108.5 17 2.5 2.5 0 006 19.5z','M18 19.5a2.5 2.5 0 102.5-2.5 2.5 2.5 0 00-2.5 2.5z'],
 // Security
 lock: ['M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2z','M7 11V7a5 5 0 0110 0v4'],
 shield: ['M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z'],
 fingerprint: ['M2 12C2 6.477 6.477 2 12 2s10 4.477 10 10','M12 12a4 4 0 100-8','M12 22a10 10 0 006.32-2.26','M12 18a6 6 0 006-6'],
 // Misc
 star: ['M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z'],
 user: ['M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2','M12 11a4 4 0 100-8 4 4 0 000 8z'],
 users: ['M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2','M9 11a4 4 0 100-8 4 4 0 000 8z','M23 21v-2a4 4 0 00-3-3.87','M16 3.13a4 4 0 010 7.75'],
 bed: ['M2 4v16','M22 20V12a2 2 0 00-2-2H6','M2 14h20','M2 8h6a2 2 0 012 2v4'],
 ambulance: ['M10 17h4','M3 17V6h12v5h4l3 3v3h-2','M6 17a2 2 0 100 4 2 2 0 000-4z','M18 17a2 2 0 100 4 2 2 0 000-4z','M12 6v5','M9.5 8.5h5'],
 surgery: ['M6 3v18','M18 3v18','M6 9h12','M6 15h12'],
 emergency: ['M12 9v4','M12 17h.01','M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z'],
 logout: ['M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4','M16 17l5-5-5-5','M21 12H9'],
 power: ['M18.36 6.64a9 9 0 11-12.73 0','M12 2v10'],
 info: ['M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z','M12 16v-4','M12 8h.01'],
 help: ['M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z','M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3','M12 17h.01'],
 share: ['M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8','M16 6l-4-4-4 4','M12 2v13'],
 print: ['M6 9V2h12v7','M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2','M6 14h12v8H6v-8z'],
 phone: ['M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z'],
 email: ['M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z','M22 6l-10 7L2 6'],
 video: ['M23 7l-7 5 7 5V7z','M14 5H3a2 2 0 00-2 2v10a2 2 0 002 2h11a2 2 0 002-2V7a2 2 0 00-2-2z'],
 mic: ['M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z','M19 10v2a7 7 0 01-14 0v-2','M12 19v4','M8 23h8'],
 // Provider types
 doctor: ['M12 11a4 4 0 100-8 4 4 0 000 8z','M6 21v-2a4 4 0 018 0v2','M15 7a3 3 0 11-6 0'],
 facility: ['M3 21h18','M3 7v14','M21 7v14','M5 7h14l-7-5-7 5z','M9 21v-4h6v4','M9 14h.01','M15 14h.01','M9 10h.01','M15 10h.01'],
 pharmacy: ['M12 2L4 6v4c0 5.55 3.41 10.74 8 12 4.59-1.26 8-6.45 8-12V6l-8-4z','M8 12h8','M12 8v8'],
 lab: ['M14.5 2v17.5c0 1.4-1.1 2.5-2.5 2.5S9.5 20.9 9.5 19.5V2','M8 2h8','M9.5 8h5','M9.5 12h5'],
 radiology: ['M12 2a10 10 0 100 20 10 10 0 000-20z','M12 6a6 6 0 100 12 6 6 0 000-12z','M12 10a2 2 0 100 4 2 2 0 000-4z'],
 nursing: ['M8 2v4','M16 2v4','M3 10h18','M3 6h18v16H3V6z','M12 14v4','M10 16h4'],
 // Extra
 copy: ['M20 9h-7a2 2 0 00-2 2v7a2 2 0 002 2h7a2 2 0 002-2v-7a2 2 0 00-2-2z','M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1'],
 link: ['M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71','M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71'],
 sort: ['M11 5h10','M11 9h7','M11 13h4','M3 17l3 3 3-3','M6 18V4'],
 sun: ['M12 12m-4 0a4 4 0 108 0 4 4 0 10-8 0','M12 2v2','M12 20v2','M4.93 4.93l1.41 1.41','M17.66 17.66l1.41 1.41','M2 12h2','M20 12h2','M6.34 17.66l-1.41 1.41','M19.07 4.93l-1.41 1.41'],
 moon: ['M12 3a6 6 0 009 9 9 9 0 11-9-9z'],
 globe: ['M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z','M2 12h20','M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z'],
 briefcase: ['M16 20V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v16','M2 6h20v14a2 2 0 01-2 2H4a2 2 0 01-2-2V6z'],
 bookOpen: ['M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z','M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z'],
};

// ─── Main Icon Component (SVG) ────────────────────────────────────────────────
export function I({ name, size = 22, color, strokeWidth = 1.8 }: IconProps) {
 const { theme } = useTheme();
 const activeColor = color ?? theme.text;

 // Normalize icon names (aliases)
 let key = name;
 if (name === 'test_tube') key = 'testTube';
 if (name === 'trending_up') key = 'trendUp';
 if (name === 'orders') key = 'delivery';
 if (name === 'jobs') key = 'briefcase';
 if (name === 'drugs') key = 'pill';

 const paths = PATHS[key];
 if (!paths) return <View style={{ width: size, height: size }} />;

 return (
 <Svg width={size} height={size} viewBox="0 0 24 24"
 fill="none" stroke={activeColor} strokeWidth={strokeWidth}
 strokeLinecap="round" strokeLinejoin="round">
 {paths.map((d, i) => <Path key={i} d={d} />)}
 </Svg>
 );
}

// ─── Icon with Background Circle ──────────────────────────────────────────────
export function IBg({
 name, size = 20, color, bg, style,
}: IconProps & { bg?: string; style?: object }) {
 const { theme } = useTheme();
 const c = color ?? theme.primary;
 return (
 <View style={[{
 width: size * 2,
 height: size * 2,
 borderRadius: size * 0.5,
 backgroundColor: bg ?? `${c}12`,
 alignItems: 'center',
 justifyContent: 'center',
 }, style]}>
 <I name={name} size={size} color={c} />
 </View>
 );
}

// ─── Provider Type Icon ───────────────────────────────────────────────────────
const PROV_COLORS: Record<string, string> = {
 doctor: '#4CAF50', facility: '#2196F3', pharmacy: '#FF9800',
 lab: '#9C27B0', radiology: '#009688', nursing: '#E91E63',
};

export function ProviderIcon({ type, size = 24, style }: { type: string; size?: number; style?: object }) {
 const c = PROV_COLORS[type] ?? '#999';
 return (
 <View style={[{
 width: size * 2, height: size * 2,
 borderRadius: size * 0.5,
 backgroundColor: `${c}12`,
 borderWidth: 1.5, borderColor: `${c}25`,
 alignItems: 'center', justifyContent: 'center',
 }, style]}>
 <I name={type} size={size} color={c} />
 </View>
 );
}

// ─── Nav Tab Icon ─────────────────────────────────────────────────────────────
export function NavIcon({
 name, active, activeColor = '#4CAF50', inactiveColor = '#A0A0A0', size = 22,
}: { name: string; active: boolean; activeColor?: string; inactiveColor?: string; size?: number }) {
 return <I name={name} size={size} color={active ? activeColor : inactiveColor} strokeWidth={active ? 2.2 : 1.6} />;
}

// ─── Status Dot ───────────────────────────────────────────────────────────────
export function StatusDot({ status, size = 10 }: { status: 'online'|'offline'|'busy'|'away'; size?: number }) {
 const colors: Record<string, string> = { online:'#4CAF50', offline:'#9E9E9E', busy:'#F44336', away:'#FF9800' };
 return <View style={{ width:size, height:size, borderRadius:size/2, backgroundColor:colors[status]??'#9E9E9E' }} />;
}

// ─── Rating Stars (SVG) ──────────────────────────────────────────────────────
export function RatingStars({
 rating, max = 5, size = 16, color = '#FFC107', emptyColor = '#E0E0E0',
}: { rating: number; max?: number; size?: number; color?: string; emptyColor?: string }) {
 return (
 <View style={{ flexDirection: 'row', gap: 2 }}>
 {Array.from({ length: max }).map((_, i) => (
 <Svg key={i} width={size} height={size} viewBox="0 0 24 24"
 fill={i < Math.floor(rating) ? color : 'none'}
 stroke={i < Math.floor(rating) ? color : emptyColor}
 strokeWidth={1.5}>
 <Path d={PATHS.star[0]} />
 </Svg>
 ))}
 </View>
 );
}
