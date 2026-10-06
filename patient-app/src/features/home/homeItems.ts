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
  { service: 'emergency', label: 'إسعاف', route: '/emergency/sos' },
];

/** The AI tools row of the board. */
export const HOME_TOOLS: HomeTool[] = [
  { label: 'فحص الأعراض', icon: 'heartbeat', tone: SERVICE_ICONS.nursing.tone, route: '/ai/symptom-checker' },
  { label: 'مترجم الروشتات', icon: 'translate', tone: 'violet', route: '/ai/prescription-translator' },
  { label: 'تحليل البشرة', icon: 'scan', tone: 'pink', route: '/ai/skin-analysis' },
  { label: 'طبيب افتراضي', icon: 'robot', tone: 'blue', route: '/ai/chat-doctor' },
  { label: 'التقرير الشهري', icon: 'chart-line-up', tone: 'mint', route: '/ai/monthly-report' },
];
