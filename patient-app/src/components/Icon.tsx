import React from 'react';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { lightColors, darkColors } from '../theme/colors';

const STATIC_MAP: Record<string, string> = {'back': 'arrow-right', 'diagnostics': 'flask', 'doctor': 'doctor', 'hospital': 'hospital-building', 'pulse': 'heart-pulse', 'heartPulse': 'heart-pulse', 'bloodBag': 'blood-bag', 'user': 'account', 'users': 'account-group', 'success': 'check-circle', 'error': 'alert-circle', 'info': 'information', 'chevronLeft': 'chevron-left', 'chevronRight': 'chevron-right', 'chevron_left': 'chevron-left', 'chevron_right': 'chevron-right', 'add': 'plus', 'check_circle': 'check-circle', 'medication': 'pill', 'prescriptions': 'pill', 'warning': 'alert', 'search': 'magnify', 'document': 'file-document', 'shield': 'shield', 'science': 'flask', 'refresh': 'refresh', 'lock': 'lock', 'favorite': 'heart', 'close': 'close', 'camera': 'camera', 'shopping_cart': 'cart', 'share': 'share-variant', 'send': 'send', 'location': 'map-marker', 'calendar': 'calendar', 'clock': 'clock', 'sparkles': 'creation', 'remove': 'minus', 'emergency': 'ambulance', 'mic': 'microphone', 'download': 'download', 'navigate': 'navigation', 'monitor_heart': 'heart-pulse', 'map': 'map', 'chat': 'chat', 'card': 'credit-card', 'auto_awesome': 'auto-fix', 'apple': 'apple', 'wallet': 'wallet', 'trending_up': 'trending-up', 'trendingDown': 'trending-down', 'food': 'food', 'restaurant_menu': 'silverware', 'run': 'run', 'walk': 'walk', 'weight': 'weight', 'flash': 'flash', 'trash': 'delete', 'edit': 'pencil', 'water_drop': 'water', 'health_and_safety': 'shield-check', 'dentistry': 'tooth-outline', 'home_health': 'home-heart', 'pregnant_woman': 'human-pregnant', 'pin_drop': 'map-marker', 'ecg_heart': 'heart-pulse', 'smart_toy': 'robot', 'translate': 'translate', 'face_retouching_natural': 'face-woman', 'insights': 'chart-line', 'apps': 'apps', 'receipt': 'receipt', 'baby-carriage': 'baby-carriage', 'microscope': 'microscope', 'shield-check': 'shield-check', 'check-circle': 'check-circle', 'alert-circle-outline': 'alert-circle-outline', 'grass': 'grass', 'child_care': 'baby-face', 'event_available': 'calendar-check', 'calendar_today': 'calendar-today', 'error_outline': 'alert-circle-outline', 'add_circle_outline': 'plus-circle-outline', 'remove_circle_outline': 'minus-circle-outline', 'analytics': 'google-analytics', 'medical_services': 'medical-bag', 'check': 'check', 'star': 'star', 'x-twitter': 'twitter', 'snapchat-ghost': 'snapchat', 'google': 'google', 'bell': 'bell', 'home-variant-outline': 'home-variant-outline', 'hospital-box-outline': 'hospital-box-outline', 'map-marker-radius-outline': 'map-marker-radius-outline', 'map-marker-outline': 'map-marker-outline', 'account-tie': 'account-tie', 'flask-outline': 'flask-outline', 'file-document-outline': 'file-document-outline', 'home': 'home', 'home-map-marker': 'home-map-marker', 'home-plus': 'home-plus', 'hospital-building': 'hospital-building', 'hospital-marker': 'hospital-marker', 'image': 'image', 'image-multiple': 'image-multiple', 'information': 'information', 'language': 'web', 'magnify': 'magnify', 'nurse': 'account-nurse', 'notification': 'bell', 'permissions': 'shield-key', 'person': 'account', 'phone': 'phone', 'radiology-box-outline': 'radiology-box-outline', 'register': 'account-plus', 'reset-password': 'lock-reset', 'security': 'shield-check', 'services': 'toolbox', 'settings': 'cog', 'sleep': 'sleep', 'stethoscope': 'stethoscope', 'store-outline': 'store-outline', 'sync': 'sync', 'test-tube': 'test-tube', 'trash-can-outline': 'trash-can-outline', 'trophy': 'trophy', 'tune': 'tune', 'video': 'video', 'watch': 'watch', 'welcome': 'hand-wave', 'cart-plus': 'cart-plus', 'credit-card': 'credit-card', 'water': 'water', 'arrow-left-circle': 'arrow-left-circle', 'arrow-left': 'arrow-left', 'cart-remove': 'cart-remove', 'file-clock': 'file-clock', 'clipboard-text-outline': 'clipboard-text-outline', 'close-circle-outline': 'close-circle-outline', 'map-marker-radius': 'map-marker-radius', 'biotech': 'biotech', 'otp': 'otp', 'close-circle': 'close-circle', 'arrow_forward': 'arrow-right', 'login': 'login', 'directions': 'directions', 'neurology': 'brain', 'nutrition': 'food-apple', 'camera-plus': 'camera-plus', 'userAdd': 'userAdd', 'eyeOff': 'eyeOff', 'bloodtype': 'bloodtype', 'gift': 'gift', 'check-bold': 'check-bold', 'food-off': 'food-off', 'cancel': 'cancel', 'calendar-clock': 'calendar-clock', 'index': 'index', 'locationFilled': 'locationFilled', 'arrow-back-ios': 'arrow-back-ios', 'clock-outline': 'clock-outline', 'cash-multiple': 'cash-multiple', 'health': 'health', 'calendar-check': 'calendar-check', 'attach': 'attach', 'upload': 'upload', 'call': 'call', 'arrow-forward': 'arrow-right', 'pharmacy': 'pharmacy', 'forgot-password': 'forgot-password', 'ambulance': 'ambulance', 'fingerprint': 'fingerprint', 'robot': 'robot', 'account-search-outline': 'account-search-outline', 'consultations': 'consultations', 'globe': 'globe', 'brain': 'brain', 'qr-code-scanner': 'qrcode-scan', 'vaccines': 'biotech', 'restaurant': 'silverware', 'speed': 'speedometer', 'straighten': 'ruler', 'waving-hand': 'hand-wave'};

export type IconName = string;

export function Icon({ name, color, size = 24, style }: any) {
  const { isDark, lang } = useApp() as any;
  const colors = isDark ? darkColors : lightColors;
  
  const resolveColor = (c: any) => {
    if (!c || typeof c !== 'string') return colors.n;
    if (c.startsWith('var(')) {
      const v = c.replace('var(--', '').replace(')', '');
      return (colors as any)[v] || c;
    }
    return (colors as any)[c] || c;
  };

  const isRTL = lang === 'ar' || lang === 'ur';
  let resolvedColor = resolveColor(color);
  
  let baseName = name || 'help-circle';
  
  // RTL fixes
  if (baseName === 'back') {
    baseName = isRTL ? 'arrow-right' : 'arrow-left';
  } else if (baseName === 'chevron-left' || baseName === 'chevronLeft') {
    baseName = isRTL ? 'chevron-right' : 'chevron-left';
  } else if (baseName === 'chevron-right' || baseName === 'chevronRight' || baseName === 'chevron_right') {
    baseName = isRTL ? 'chevron-left' : 'chevron-right';
  }

  if (baseName.startsWith('ios-') || baseName.startsWith('md-')) {
    return <Ionicons name={baseName as any} size={size} color={resolvedColor} style={style} />;
  }

  let finalName = STATIC_MAP[baseName] || baseName.replace(/_/g, '-');

  return <MaterialCommunityIcons name={finalName as any} size={size} color={resolvedColor} style={style} />;
}

export default Icon;
