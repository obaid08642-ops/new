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
  { service: 'lab', title: 'services.cat.laboratoryTests', route: '/(tabs)/diagnostics' },
  { service: 'nursing', title: 'services.cat.homeNursing', route: '/(tabs)/nursing', badge: 'services.cat.new' },
  { service: 'radiology', title: 'services.cat.diagnosticImaging', route: '/diagnostics/packages' },
  { service: 'maternity', title: 'services.cat.maternityCare', route: '/maternity/hub' },
];

/** The rest of the Services tab, as rows. */
export const MORE_SERVICES: ServiceRow[] = [
  { icon: 'ambulance', tone: tone('emergency'), title: 'emergency.title', desc: 'emergency.serviceDesc', route: '/emergency' },
  { icon: 'eye', tone: 'blue', title: 'services.cat.visionTest', desc: 'services.cat.bookEyeExamWith', route: '/search?view=doctors&specialty=ophthalmology' },
  { icon: 'tooth', tone: 'blue', title: 'services.cat.dentistry', desc: 'services.cat.cleaningFillingOrthoImplants', route: '/search?view=doctors&specialty=dentistry' },
  { icon: 'brain', tone: tone('mind'), title: 'services.cat.mentalHealth', desc: 'services.cat.psychologicalConsultationsTherapySessions', route: '/mental-health/hub' },
  { icon: 'bowl-food', tone: tone('nutrition'), title: 'services.cat.nutritionDiet', desc: 'services.cat.dietPlansCalorieTracking', route: '/nutrition/hub' },
  { icon: 'house', tone: tone('nursing'), title: 'services.cat.homeCare', desc: 'services.cat.elderlyChronicCare', route: '/(tabs)/nursing' },
];
