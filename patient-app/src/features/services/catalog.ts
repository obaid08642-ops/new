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

export interface ServiceGroupData {
  title: string;
  items: ServiceRow[];
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
  { service: 'maternity', title: 'رعاية الأمومة', route: '/maternity/pregnancy-tracker' },
];

/** The rest of the Services tab, as rows. */
export const MORE_SERVICES: ServiceRow[] = [
  { icon: 'ambulance', tone: tone('emergency'), title: 'الطوارئ والإسعاف', desc: 'طلب إسعاف أو استشارة طارئة', route: '/emergency/sos' },
  { icon: 'eye', tone: 'blue', title: 'فحص النظر', desc: 'حجز فحص عيون مع أخصائي', route: '/search?view=doctors&specialty=ophthalmology' },
  { icon: 'tooth', tone: 'mint', title: 'طب الأسنان', desc: 'تنظيف، حشو، تقويم، زراعة', route: '/search?view=doctors&specialty=dentistry' },
  { icon: 'brain', tone: tone('mind'), title: 'الصحة النفسية', desc: 'استشارات نفسية وجلسات علاجية', route: '/mental-health/hub' },
  { icon: 'bowl-food', tone: tone('nutrition'), title: 'التغذية والحمية', desc: 'خطط غذائية وتتبع السعرات', route: '/nutrition/hub' },
  { icon: 'house', tone: tone('nursing'), title: 'الرعاية المنزلية', desc: 'رعاية كبار السن والأمراض المزمنة', route: '/(tabs)/nursing' },
];

/** Every section of the app, for "all services". */
export const SERVICE_GROUPS: ServiceGroupData[] = [
  {
    title: 'الرعاية الطبية',
    items: [
      { title: 'استشارات الأطباء', desc: 'عيادة، فيديو، أو زيارة منزلية', icon: 'stethoscope', tone: 'blue', route: '/(tabs)/consultations' },
      { title: 'التحاليل المخبرية', desc: 'سحب عينة منزلي أو زيارة المختبر', icon: 'test-tube', tone: 'mint', route: '/(tabs)/diagnostics' },
      { title: 'الأشعة والتصوير', desc: 'حجز مواعيد الأشعة', icon: 'scan', tone: 'violet', route: '/(tabs)/diagnostics' },
      { title: 'التمريض المنزلي', desc: 'رعاية تمريضية في منزلك', icon: 'first-aid-kit', tone: tone('nursing'), route: '/(tabs)/nursing' },
      { title: 'الإسعاف', desc: 'طلب إسعاف طارئ فوري', icon: 'ambulance', tone: 'peach', route: '/emergency/sos' },
      { title: 'الصيدلية', desc: 'أدوية ومنتجات صحية بتوصيل سريع', icon: 'pill', tone: tone('pharmacy'), route: '/(tabs)/pharmacy' },
    ],
  },
  {
    title: 'صحتي',
    items: [
      { title: 'الملف الصحي', desc: 'علاماتك الحيوية وسجلك الطبي', icon: 'heartbeat', tone: tone('health'), route: '/(tabs)/health' },
      { title: 'التذكيرات الذكية', desc: 'تذكيرات الأدوية والمواعيد', icon: 'bell', tone: 'amber', route: '/health/smart-reminders' },
      { title: 'التقارير الطبية', desc: 'تقاريرك ونتائجك في مكان واحد', icon: 'file-text', tone: 'blue', route: '/reports/view-report' },
      { title: 'الرعاية المزمنة', desc: 'تذكير ومتابعة', icon: 'heart', tone: tone('health'), route: '/health/medication-reminder-list' },
    ],
  },
  {
    title: 'أدوات الذكاء الاصطناعي',
    items: [
      { title: 'المساعد الطبي الذكي', desc: 'فرز الأعراض وإرشاد أولي', icon: 'robot', tone: 'violet', route: '/ai-assistant' },
      { title: 'مترجم الروشتات', desc: 'فهم وصفتك الطبية بسهولة', icon: 'translate', tone: 'violet', route: '/ai/prescription-translator' },
      { title: 'التقرير الشهري', desc: 'ملخص صحتك خلال الشهر', icon: 'chart-line-up', tone: 'mint', route: '/ai/monthly-report' },
    ],
  },
  {
    title: 'العائلة والمجتمع',
    items: [
      { title: 'التغذية', desc: 'خطط وجبات وإرشاد غذائي', icon: 'bowl-food', tone: tone('nutrition'), route: '/nutrition/hub' },
      { title: 'الأمومة', desc: 'متابعة الحمل والأمومة', icon: 'baby', tone: tone('maternity'), route: '/maternity/hub' },
      { title: 'الصحة النفسية', desc: 'دعم وموارد الصحة النفسية', icon: 'brain', tone: 'violet', route: '/mental-health' },
      { title: 'مجتمع نبض', desc: 'تجارب ونقاشات صحية', icon: 'users', tone: 'blue', route: '/community/hub' },
      { title: 'عائلتي', desc: 'إدارة أفراد العائلة', icon: 'users-three', tone: tone('family'), route: '/family' },
    ],
  },
  {
    title: 'حسابي وخدماتي',
    items: [
      { title: 'مركز الطلبات', desc: 'كل طلباتك وحجوزاتك في مكان واحد', icon: 'receipt', tone: 'ink', route: '/orders' },
      { title: 'التأمين الطبي', desc: 'وثيقتك وتغطيتك التأمينية', icon: 'shield-check', tone: 'blue', route: '/insurance' },
      { title: 'نقاط الولاء', desc: 'اكسب واستبدل النقاط', icon: 'star', tone: 'amber', route: '/loyalty/hub' },
      { title: 'العروض والباقات', desc: 'خصومات وباقات صحية', icon: 'tag', tone: tone('pharmacy'), route: '/offers' },
      { title: 'خريطة مقدمي الخدمة', desc: 'أقرب المنشآت إليك', icon: 'map-trifold', tone: 'amber', route: '/map' },
    ],
  },
];
