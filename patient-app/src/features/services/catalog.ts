import { SERVICE_ICONS, type FillIconName, type ServiceName, type ServiceTone } from '../../../../packages/ui/icons/fill';

/** The tone the handoff service map gives a service (so a row of that service cannot drift from it). */
const tone = (service: ServiceName): ServiceTone => SERVICE_ICONS[service].tone;

/**
 * What the Services screens list. The titles and descriptions are the Arabic source text the app already
 * showed (translated through the six-language catalogue when drawn), the routes are the ones it already
 * linked to, and each row carries the icon and tone of the handoff service map (handoff section 1).
 */

export interface ServiceRow {
  title: string;
  desc: string;
  icon: FillIconName;
  tone: ServiceTone;
  route: string;
}

/** The four main services of the Services tab, drawn as tiles of the service map. */
export interface MainService {
  service: ServiceName;
  title: string;
  route: string;
  badge?: string;
}

export const MAIN_SERVICES: MainService[] = [
  { service: 'lab', title: 'التحاليل المخبرية', route: '/(tabs)/diagnostics' },
  { service: 'nursing', title: 'التمريض المنزلي', route: '/(tabs)/nursing', badge: 'جديد' },
  { service: 'radiology', title: 'الأشعة التشخيصية', route: '/diagnostics/packages' },
  { service: 'maternity', title: 'رعاية الأمومة', route: '/maternity/hub' },
];

/** The rest of the Services tab, as rows. */
export const MORE_SERVICES: ServiceRow[] = [
  { icon: 'ambulance', tone: tone('emergency'), title: 'emergency.title', desc: 'emergency.serviceDesc', route: '/emergency' },
  { icon: 'eye', tone: 'blue', title: 'فحص النظر', desc: 'حجز فحص عيون مع أخصائي', route: '/search?view=doctors&specialty=ophthalmology' },
  { icon: 'tooth', tone: 'mint', title: 'طب الأسنان', desc: 'تنظيف، حشو، تقويم، زراعة', route: '/search?view=doctors&specialty=dentistry' },
  { icon: 'brain', tone: tone('mind'), title: 'الصحة النفسية', desc: 'استشارات نفسية وجلسات علاجية', route: '/mental-health/hub' },
  { icon: 'bowl-food', tone: tone('nutrition'), title: 'التغذية والحمية', desc: 'خطط غذائية وتتبع السعرات', route: '/nutrition/hub' },
  { icon: 'house', tone: tone('nursing'), title: 'الرعاية المنزلية', desc: 'رعاية كبار السن والأمراض المزمنة', route: '/(tabs)/nursing' },
];
