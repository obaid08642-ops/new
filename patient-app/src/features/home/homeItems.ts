import type { HomeService, HomeTool } from '../../components/home/HomeParts';
import { SERVICE_ICONS } from '../../../../packages/ui/icons/fill';

/** The nine services of canvas/HomeApp.dc.html, in its order, with the routes the app already had for them. */
export const HOME_SERVICES: HomeService[] = [
  { service: 'consult', label: 'استشارات', route: '/(tabs)/consultations' },
  { service: 'pharmacy', label: 'صيدلية', route: '/(tabs)/pharmacy' },
  { service: 'lab', label: 'تحاليل وأشعة', route: '/(tabs)/diagnostics' },
  { service: 'nursing', label: 'تمريض', route: '/(tabs)/nursing' },
  { service: 'nutrition', label: 'التغذية', route: '/nutrition/hub' },
  { service: 'maternity', label: 'الأمومة', route: '/maternity/hub' },
  { service: 'map', label: 'الخريطة', route: '/map' },
  { service: 'health', label: 'صحتي', route: '/(tabs)/health' },
  { service: 'emergency', label: 'emergency.title', route: '/emergency' },
];

/** The AI tools row of the board. */
export const HOME_TOOLS: HomeTool[] = [
  { label: 'فحص الأعراض', icon: 'heartbeat', tone: SERVICE_ICONS.nursing.tone, route: '/ai?mode=symptoms' },
  { label: 'مترجم الروشتات', icon: 'translate', tone: 'violet', route: '/ai?mode=prescription' },
  { label: 'التقرير الشهري', icon: 'chart-line-up', tone: 'mint', route: '/ai/monthly-report' },
];
