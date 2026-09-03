import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SearchIntent, SearchIntentDocument, IntentType, EntityType, ServiceMode } from './schemas/search-intent.schema';
import { QueryAnalytics, QueryAnalyticsDocument } from './schemas/query-analytics.schema';
import { LocationService, ResolvedLocation } from '../location/location.service';
import { normalizeSearchText } from '../seo-search/seo-search.module';

export interface ExtractedSearchIntent {
  raw_query: string;
  normalized_query: string;
  locale: string;
  intent_type: IntentType;
  entity_type: EntityType;
  specialty?: string;
  service?: string;
  insurance?: string;
  service_mode?: ServiceMode;
  location?: ResolvedLocation;
  ranking_signal?: 'top_rated' | 'recommended';
  location_signal?: 'near_me';
  canonical_path: string;
  confidence: number;
}

// Multilingual dictionaries for intent extraction
const SPECIALTIES: Array<{ code: string; patterns: string[] }> = [
  { code: 'dermatology', patterns: ['جلدية', 'دكتور جلدية', 'طبيب جلدية', 'dermatology', 'dermatologist', 'skin doctor', 'جلدی امراض', 'त्वचा', 'চর্মরোগ', 'dermatolohiya'] },
  { code: 'cardiology', patterns: ['قلب', 'دكتور قلب', 'امراض قلب', 'cardiology', 'cardiologist', 'heart doctor', 'دل کا ڈاکٹر', 'हृदय रोग', 'হৃদরোগ', 'doktor sa puso'] },
  { code: 'pediatrics', patterns: ['اطفال', 'دكتور اطفال', 'طبيب اطفال', 'pediatrics', 'pediatrician', 'pediatric', 'pediatric doctor', 'child doctor', 'بچوں کے امراض', 'bachon ka doctor', 'bachon ke doctor', 'बाल रोग', 'শিশু রোগ', 'doktor ng bata'] },
  { code: 'gynecology', patterns: ['نساء وتوليد', 'نساء ولادة', 'طبيبة نساء', 'gynecology', 'obstetrics', 'obgyn', 'امراض نسواں', 'प्रसूति रोग', 'স্ত্রীরোগ', 'komadrona'] },
  { code: 'internal_medicine', patterns: ['باطنية', 'دكتور باطنية', 'internal medicine', 'internist', 'اندرونی امراض', 'आंतरिक चिकित्सा', 'মেডিসিন', 'panloob na gamot'] },
  { code: 'orthopedics', patterns: ['عظام', 'دكتور عظام', 'orthopedics', 'orthopedic', 'bone doctor', 'ہڈیوں کے امراض', 'हड्डी रोग', 'অর্থোপেডিক', 'doktor sa buto'] },
  { code: 'ent', patterns: ['انف واذن', 'انف واذن وحنجرة', 'ent', 'ear nose throat', 'ناک کان گلا', 'ईएनटी', 'ইএনটি'] },
  { code: 'dentistry', patterns: ['اسنان', 'دكتور اسنان', 'طب اسنان', 'dental', 'dentist', 'teeth', 'دانتوں کے امراض', 'दंत चिकित्सा', 'দন্তচিকিৎসা', 'dentista'] },
];

const SERVICES: Array<{ code: string; entity: EntityType; mode: ServiceMode; patterns: string[] }> = [
  // Nursing
  { code: 'home_nursing', entity: 'nursing', mode: 'home', patterns: ['تمريض منزلي', 'ممرض منزلي', 'ممرضة منزلية', 'home nurse', 'home nursing', 'نرس منزلي', 'گھر پر نرسنگ'] },
  { code: 'wound_dressing', entity: 'nursing', mode: 'home', patterns: ['غيار جرح', 'تغيير جرح', 'تضميد جرح', 'wound dressing', 'قرح فراش', 'زخم بندی', 'घाव की पट्टी'] },
  
  // Labs
  { code: 'blood_test', entity: 'lab', mode: 'home', patterns: ['سحب دم', 'عينة دم', 'تحليل دم', 'blood test', 'blood sample', 'بلڈ ٹیسٹ', 'रक्त परीक्षण'] },
  { code: 'cbc', entity: 'lab', mode: 'home', patterns: ['تحليل cbc', 'فحص cbc', 'cbc', 'complete blood count'] },
  
  // Radiology
  { code: 'x_ray', entity: 'radiology', mode: 'clinic', patterns: ['اشعة x', 'اشعة سينية', 'x-ray', 'xray', 'ایکسرے'] },
  { code: 'ultrasound', entity: 'radiology', mode: 'clinic', patterns: ['سونار', 'اشعة صوتية', 'ultrasound', 'الٹراساؤنڈ', 'अल्ट्रासाउंड'] },
  { code: 'home_radiology', entity: 'radiology', mode: 'home', patterns: ['اشعة منزلية', 'تصوير منزلي', 'home radiology', 'home x-ray'] },
];

const INSURANCES: Array<{ code: string; patterns: string[] }> = [
  { code: 'bupa', patterns: ['بوبا', 'بوبة', 'bupa'] },
  { code: 'tawuniya', patterns: ['التعاونية', 'التعاونيه', 'tawuniya'] },
  { code: 'medgulf', patterns: ['ميدغلف', 'ميد غلف', 'medgulf'] },
  { code: 'rajhi_takaful', patterns: ['تكافل الراجحي', 'الراجحي', 'rajhi takaful'] },
  { code: 'walaa', patterns: ['ولاء', 'walaa'] },
  { code: 'malath', patterns: ['ملاذ', 'malath'] },
];

@Injectable()
export class SearchIntentService {
  private readonly logger = new Logger(SearchIntentService.name);

  constructor(
    @InjectModel(SearchIntent.name) private readonly intentModel: Model<SearchIntentDocument>,
    @InjectModel(QueryAnalytics.name) private readonly analyticsModel: Model<QueryAnalyticsDocument>,
    private readonly locationService: LocationService,
  ) {}

  /**
   * Centralized intelligence parser: extracts intent, entity type, filters, location, and canonical path.
   */
  async extractIntent(
    rawQuery: string,
    locale = 'ar',
    clientType = 'web',
  ): Promise<ExtractedSearchIntent> {
    const normalized = normalizeSearchText(rawQuery);
    let entityType: EntityType = 'service';
    let intentType: IntentType = 'discovery';
    let detectedSpecialty: string | undefined;
    let detectedService: string | undefined;
    let detectedInsurance: string | undefined;
    let detectedMode: ServiceMode | undefined;
    let rankingSignal: 'top_rated' | 'recommended' | undefined;
    let locationSignal: 'near_me' | undefined;
    let confidence = 0.5;

    // 1. Check ranking signals ("best", "top", "أفضل", "أحسن")
    if (/(?:^|\s)(افضل|احسن|توب|best|top|highest rated|بہترین|सबसे अच्छा)(?:$|\s)/i.test(normalized) ||
        /\b(best|top|highest rated)\b/i.test(normalized)) {
      rankingSignal = 'top_rated';
    }

    // 2. Check location signals ("near me", "قريب مني", "بالقرب مني")
    if (/(?:^|\s)(قريب|بالقرب|near me|nearby|میرے قریب|मेरे पास)(?:$|\s)/i.test(normalized) ||
        /\b(near me|nearby)\b/i.test(normalized)) {
      locationSignal = 'near_me';
    }

    // 3. Resolve Location (City, District)
    const resolvedLoc = await this.locationService.resolveFromText(rawQuery);

    // 4. Check Specialties
    for (const spec of SPECIALTIES) {
      for (const pat of spec.patterns) {
        if (normalized.includes(normalizeSearchText(pat))) {
          detectedSpecialty = spec.code;
          entityType = 'doctor';
          confidence = 0.9;
          break;
        }
      }
      if (detectedSpecialty) break;
    }

    // 5. Check Healthcare Services (Nursing, Lab, Radiology)
    for (const s of SERVICES) {
      for (const pat of s.patterns) {
        if (normalized.includes(normalizeSearchText(pat))) {
          detectedService = s.code;
          entityType = s.entity;
          detectedMode = s.mode;
          confidence = 0.95;
          break;
        }
      }
      if (detectedService) break;
    }

    // 6. Check Pharmacy / Medicine patterns
    if (!detectedSpecialty && !detectedService) {
      if (
        /(?:^|\s)(صيدلية|صيدليه|دواء|علاج|حبوب|شراب|مرهم|بانادول|بنادول|باراسيتامول|بروفين|ففادول|اوميبرازول|اسبرين|انسولين|بخاخ|قطرة|pharmacy|medicine|drug|tablet|syrup|capsule|panadol|paracetamol|brufen|fevadol)(?:$|\s)/i.test(normalized) ||
        /\b(pharmacy|medicine|drug|tablet|syrup|capsule|panadol|paracetamol|brufen|fevadol)\b/i.test(normalized) ||
        /(?:^|\s)(توصيل دواء|طلب دواء|صيدليه توصل)(?:$|\s)/i.test(normalized) ||
        normalized.includes('صيدل') ||
        normalized.includes('بانادول') ||
        normalized.includes('بنادول') ||
        normalized.includes('دواء')
      ) {
        entityType = 'medicine';
        detectedMode = 'delivery';
        confidence = 0.85;
      }
    }

    // 7. Check Insurance
    for (const ins of INSURANCES) {
      for (const pat of ins.patterns) {
        if (normalized.includes(normalizeSearchText(pat))) {
          detectedInsurance = ins.code;
          break;
        }
      }
      if (detectedInsurance) break;
    }

    // 8. Determine Mode if not already determined
    if (!detectedMode) {
      if (/(?:^|\s)(منزلي|بالمنزل|في البيت|home|at home|گھر پر)(?:$|\s)/i.test(normalized) || /\b(home|at home)\b/i.test(normalized)) {
        detectedMode = 'home';
      } else if (/(?:^|\s)(فيديو|عن بعد|اونلاين|video|online|telehealth)(?:$|\s)/i.test(normalized) || /\b(video|online|telehealth)\b/i.test(normalized)) {
        detectedMode = 'video';
      } else if (/(?:^|\s)(عيادة|عياده|مركز|مستشفى|clinic|hospital)(?:$|\s)/i.test(normalized) || /\b(clinic|hospital)\b/i.test(normalized)) {
        detectedMode = 'clinic';
      }
    }

    // 9. Build Canonical Path
    const citySlug = resolvedLoc?.city?.code?.replace(/^sa-/, '').replace(/-city$/, '') || 'riyadh';
    let canonicalPath = `/${locale}`;

    if (entityType === 'doctor' && detectedSpecialty) {
      canonicalPath = `/${locale}/doctors/${detectedSpecialty}/${citySlug}`;
      if (resolvedLoc?.district) {
        const distSlug = resolvedLoc.district.code.replace(/^sa-[a-z]+-/, '');
        canonicalPath += `/${distSlug}`;
      }
    } else if (entityType === 'medicine') {
      canonicalPath = `/${locale}/medicine-catalog`;
    } else if (entityType === 'nursing') {
      canonicalPath = `/${locale}/home-nursing/${citySlug}`;
    } else if (entityType === 'lab') {
      canonicalPath = `/${locale}/diagnostics/labs`;
    } else if (entityType === 'radiology') {
      canonicalPath = `/${locale}/diagnostics/radiology`;
    } else {
      canonicalPath = `/${locale}/search`;
    }

    // Asynchronously log analytics
    this.recordAnalytics(rawQuery, normalized, locale, intentType, entityType, resolvedLoc?.city?.code, clientType).catch(() => {});

    return {
      raw_query: rawQuery,
      normalized_query: normalized,
      locale,
      intent_type: intentType,
      entity_type: entityType,
      specialty: detectedSpecialty,
      service: detectedService,
      insurance: detectedInsurance,
      service_mode: detectedMode,
      location: resolvedLoc || undefined,
      ranking_signal: rankingSignal,
      location_signal: locationSignal,
      canonical_path: canonicalPath,
      confidence,
    };
  }

  private async recordAnalytics(
    rawQuery: string,
    normalized: string,
    locale: string,
    intent: string,
    entityType: string,
    locationCode?: string,
    clientType = 'web',
  ) {
    try {
      await this.analyticsModel.create({
        raw_query: rawQuery,
        normalized_query: normalized,
        locale,
        detected_intent: intent,
        detected_entity_type: entityType,
        resolved_location_code: locationCode,
        client_type: clientType,
      });
    } catch {
      // Non-blocking telemetry
    }
  }
}
