import type { HomeService, HomeTool } from '../../components/home/HomeParts';
import { SERVICE_ICONS } from '../../../../packages/ui/icons/fill';

/** The nine services of canvas/HomeApp.dc.html, in its order, with the routes the app already had for them. */
export const HOME_SERVICES: HomeService[] = [
  { service: 'consult', label: 'services.cat.consultations', route: '/(tabs)/consultations' },
  { service: 'pharmacy', label: 'services.cat.pharmacy', route: '/(tabs)/pharmacy' },
  { service: 'lab', label: 'services.cat.labTestsAndScans', route: '/(tabs)/diagnostics' },
  { service: 'nursing', label: 'services.cat.nursing', route: '/(tabs)/nursing' },
  { service: 'nutrition', label: 'services.cat.nutrition', route: '/nutrition/hub' },
  { service: 'maternity', label: 'services.cat.motherhood', route: '/maternity/hub' },
  { service: 'health', label: 'services.cat.myHealth', route: '/(tabs)/health' },
  { service: 'emergency', label: 'emergency.title', route: '/emergency' },
];

/** The AI tools row of the board. */
export const HOME_TOOLS: HomeTool[] = [
  { label: 'services.cat.symptomCheck', icon: 'heartbeat', tone: SERVICE_ICONS.nursing.tone, route: '/ai?mode=symptoms' },
  { label: 'services.cat.prescriptionTranslator', icon: 'translate', tone: 'violet', route: '/ai?mode=prescription' },
  { label: 'services.cat.monthlyReport', icon: 'chart-line-up', tone: 'mint', route: '/ai/monthly-report' },
];
