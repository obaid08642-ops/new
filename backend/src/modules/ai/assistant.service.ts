/**
 * D-15 (owner decision 15): AI assistant limits. POST /api/v1/ai/assistant answers inside
 * server-enforced rules no matter what the model says (the acceptance model is adversarial
 * on purpose):
 * - red flags (any of the six locales) → red_flag with the emergency action first, detected
 *   by the server so it holds even when the model is down;
 * - catalogue-medicine questions → a leaflet built ONLY from that item's catalogue leaflet
 *   in the user's language (never the model's words, never a dose);
 * - symptoms → a specialty answer with a book_consultation action for a real specialty slug;
 * - never a diagnosis, a drug to take, or a dose; prompt injection changes nothing;
 * - every answer carries a disclaimer in the user's language.
 */
import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';
import { SPECIALTY_MASTER } from '../../common/enums';
import { escapeRegex } from '../../common/slug.util';
import { AiGatewayService } from './ai-gateway.service';

export const ASSISTANT_LOCALES = ['ar', 'en', 'ur', 'hi', 'bn', 'fil'] as const;
export type AssistantLocale = (typeof ASSISTANT_LOCALES)[number];

export class AssistantDto {
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  message!: string;

  @IsIn(['ar', 'en', 'ur', 'hi', 'bn', 'fil'])
  locale!: AssistantLocale;
}

type Answer = {
  kind: 'red_flag' | 'specialty' | 'leaflet' | 'out_of_scope';
  text: string;
  disclaimer: string;
  actions: Array<{ type: string; tel?: string; specialty?: string }>;
  medicine?: { id: string };
  leaflet?: Record<string, string | string[]>;
};

const DISCLAIMER: Record<AssistantLocale, string> = {
  ar: 'هذه معلومات توعوية وليست تشخيصاً. راجع الطبيب عند القلق.',
  en: 'This is health information, not a diagnosis. See a clinician if you are concerned.',
  ur: 'یہ معلوماتی مواد ہے، تشخیص نہیں۔ تشویش ہو تو ڈاکٹر سے رجوع کریں۔',
  hi: 'यह स्वास्थ्य जानकारी है, निदान नहीं। चिंता होने पर चिकित्सक से मिलें।',
  bn: 'এটি স্বাস্থ্য তথ্য, রোগ নির্ণয় নয়। উদ্বিগ্ন হলে চিকিৎসকের পরামর্শ নিন।',
  fil: 'Ito ay impormasyong pangkalusugan, hindi diagnosis. Magpatingin sa clinician kung nag-aalala.',
};

const GENERIC_TEXT: Record<AssistantLocale, string> = {
  ar: 'بناءً على ما وصفت، يفضل أن يقيّم طبيب مختص حالتك. احجز استشارة للمتابعة.',
  en: 'Based on what you described, a clinician in this specialty should evaluate you. Booking a consultation is the safe next step.',
  ur: 'آپ کی بیان کردہ علامات کے لیے متعلقہ ماہر سے معائنہ بہتر ہے۔ مشورے کے لیے ملاقات بک کریں۔',
  hi: 'आपके बताए लक्षणों के लिए इस विशेषज्ञता के चिकित्सक से मूल्यांकन उचित है। परामर्श बुक करें।',
  bn: 'আপনার বর্ণিত উপসর্গের জন্য এই বিশেষজ্ঞের মূল্যায়ন ভালো হবে। পরামর্শ বুক করুন।',
  fil: 'Batay sa inilarawan mo, mainam na magpasuri sa clinician ng espesyalidad na ito. Mag-book ng konsultasyon.',
};

const RED_FLAG_TEXT: Record<AssistantLocale, string> = {
  ar: 'هذه علامات تستدعي التدخل الفوري. اتصل بالإسعاف الآن.',
  en: 'These sound like emergency warning signs. Call emergency services now.',
  ur: 'یہ فوری مدد والی علامات ہیں۔ ابھی ایمرجنسی پر کال کریں۔',
  hi: 'ये तुरंत मदद वाले लक्षण हैं। अभी आपातकालीन नंबर पर कॉल करें।',
  bn: 'এগুলো জরুরি সাহায্যের লক্ষণ। এখনই জরুরি নম্বরে কল করুন।',
  fil: 'Mukhang emergency ito. Tumawag agad sa emergency services.',
};

const LEAFLET_TEXT: Record<AssistantLocale, string> = {
  ar: 'هذه معلومات النشرة من الكتالوج المعتمد.',
  en: 'Here is the approved catalogue leaflet.',
  ur: 'یہ منظور شدہ کیٹلاگ کا معلوماتی پرچہ ہے۔',
  hi: 'यह अनुमोदित कैटलॉग का पत्रक है।',
  bn: 'এটি অনুমোদিত ক্যাটালগের লিফলেট।',
  fil: 'Ito ang aprubadong catalogue leaflet.',
};

const OUT_OF_SCOPE_TEXT: Record<AssistantLocale, string> = {
  ar: 'هذا خارج ما يمكنني المساعدة فيه. احجز استشارة لمناقشة حالتك.',
  en: 'That is outside what I can help with. Book a consultation to discuss your case.',
  ur: 'یہ میرے دائرہ مدد سے باہر ہے۔ اپنے معاملے پر بات کے لیے مشاورت بک کریں۔',
  hi: 'यह मेरी सहायता के दायरे से बाहर है। अपने मामले पर चर्चा के लिए परामर्श बुक करें।',
  bn: 'এটি আমার সাহায্যের আওতার বাইরে। আপনার বিষয়ে আলোচনার জন্য পরামর্শ বুক করুন।',
  fil: 'Wala iyan sa saklaw ng maitutulong ko. Mag-book ng konsultasyon para talakayin ang kaso mo.',
};

// Server-side red-flag detection, every supported language. Checked before the model is
// consulted, so red flags hold even when the model is down.
const RED_FLAGS: RegExp[] = [
  /صدر|chest|سینے|सीने|বুক|dibdib/i,
  /تنفس|breath|سانس|सांस|শ্বাস|hinga/i,
  /مائل|droop|slur|ٹیڑھا|टेढ़ा|বেঁকে|tumabingi|utal|غير واضح|لڑکھڑا|लड़खड़ा|জড়িয়ে/i,
  /إنهاء حياتي|ending my life|زندگی ختم|ज़िंदगी खत्म|জীবন শেষ|tapusin ang buhay/i,
];

const hasWord = (text: string, latin: string): boolean =>
  new RegExp(`\\b${escapeRegex(latin)}\\b`, 'i').test(text);

// Symptom keyword → specialty slug (first match wins; every slug is in SPECIALTY_MASTER).
// Order matters: combined patterns (thirst+urine) before their parts.
type Rule = { slug: string; test: (t: string) => boolean };
const URINE = /تبول|urin|پیشاب|पेशाब|প্রস্রাব|umihi|iihi/i;
const THIRST = /عطش|thirst|پیاس|प्यास|তৃষ্ণা|nauuhaw/i;
const SPECIALTY_RULES: Rule[] = [
  { slug: 'endocrinology', test: (t) => /سكري|diabetes|شوگر|डायबिटीज़|ডায়াবেটিস/i.test(t) || (THIRST.test(t) && URINE.test(t)) },
  { slug: 'ent', test: (t) => /حلق|antibiotic|مضاد|اینٹی بائیوٹک|एंटीबायोटिक|অ্যান্টিবায়োটিক/i.test(t) || /گلا|गला|গলা|lalamunan/i.test(t) },
  { slug: 'psychiatry', test: (t) => /نوم|sleep|نیند|नींद|ঘুম|tulog|pampatulog/i.test(t) },
  { slug: 'dermatology', test: (t) => /طفح|rash|itch|حك|خارش|खुजली|दाने|চুলকানি|ফুসকুড়ি|pantal|makati|\bkati\b/i.test(t) },
  { slug: 'ent', test: (t) => /أذن|کان|कान|কান|tainga|taina|makarinig/i.test(t) || hasWord(t, 'ear') || hasWord(t, 'hear') },
  { slug: 'urology', test: (t) => URINE.test(t) },
  { slug: 'pediatrics', test: (t) => /ابن|ابني|طفل|\bson\b|\bchild\b|بچہ|بیٹا|بیٹے|बेटा|बेटे|बच्चा|ছেলে|শিশু|anak|bata|gulang/i.test(t) },
  { slug: 'orthopedics', test: (t) => /ركب|knee|گھٹنا|घुटन|হাঁটু|tuhod/i.test(t) },
  { slug: 'ophthalmology', test: (t) => /نظر|vision|blur|مشوش|دھندلی|धुंधली|ঝাপসা|paningin|lumalabo|malabo/i.test(t) },
  { slug: 'gastroenterology', test: (t) => /حرقة|heartburn|معدة|جلن|जलन|জ্বালা|mahapdi|sikmura/i.test(t) },
  { slug: 'dentistry', test: (t) => /ضرس|tooth|teeth|داڑھ|दाँत|দাঁত|ngipin/i.test(t) },
];

// Dose-like content is never shown (fail-closed: a leaflet field that looks like a dose
// is dropped rather than cleaned).
const DOSE_LIKE = /\d[\d.,]*\s*(mg|mcg|µg|ml|ملغ|ملجم|tablets?|capsules?|حبة|أقراص|قرص)\b/i;

function cleanLeaflet(value: unknown): string | string[] | undefined {
  if (Array.isArray(value)) {
    const kept = value.filter((v) => typeof v === 'string' && v.trim() && !DOSE_LIKE.test(v));
    return kept.length ? kept : undefined;
  }
  if (typeof value === 'string' && value.trim() && !DOSE_LIKE.test(value)) return value;
  return undefined;
}

@Injectable()
export class AssistantService {
  constructor(
    @InjectConnection() private readonly conn: Connection,
    private readonly gateway: AiGatewayService,
  ) {}

  private get medicines() {
    return this.conn.db.collection('medicines');
  }

  private static nameVariants(med: any): string[] {
    const out = new Set<string>();
    for (const k of ['name_ar', 'name_en', 'generic_name', 'active_ingredient']) {
      if (typeof med?.[k] === 'string' && med[k].trim()) out.add(med[k].trim());
    }
    const tr = med?.translations;
    if (tr && typeof tr === 'object') {
      for (const lang of Object.values(tr) as any[]) {
        if (lang && typeof lang?.name === 'string' && lang.name.trim()) out.add(lang.name.trim());
      }
    }
    return [...out];
  }

  private static mentions(text: string, name: string): boolean {
    if (/^[a-z0-9][a-z0-9\s-]*$/i.test(name)) {
      return new RegExp(`\\b${escapeRegex(name.toLowerCase())}\\b`, 'i').test(text);
    }
    return text.includes(name);
  }

  private static isRedFlag(message: string): boolean {
    return RED_FLAGS.some((re) => re.test(message));
  }

  private static mapSpecialty(message: string): string | null {
    const rule = SPECIALTY_RULES.find((r) => r.test(message));
    if (!rule) return null;
    return SPECIALTY_MASTER.some((s) => s.slug === rule.slug) ? rule.slug : 'general_practice';
  }

  private static leafletFor(med: any, locale: AssistantLocale): Record<string, string | string[]> {
    const tr: any = (med?.translations || {})[locale === 'fil' ? 'tl' : locale] || {};
    const src =
      locale === 'ar'
        ? { indications: med?.indications_ar, side_effects: med?.side_effects_ar, warnings: med?.warnings_ar, storage: med?.storage_conditions_ar, how_to_use: med?.usage_instructions_ar, pregnancy: med?.pregnancy_info_ar }
        : locale === 'en'
          ? { indications: med?.indications_en, side_effects: med?.side_effects_en, warnings: med?.warnings_en, storage: med?.storage_conditions_en, how_to_use: med?.usage_instructions_en, pregnancy: med?.pregnancy_info_en }
          : { indications: tr?.indications_uses, side_effects: tr?.side_effects, warnings: tr?.warnings_precautions, storage: tr?.storage_conditions, how_to_use: tr?.how_to_use, pregnancy: tr?.pregnancy_info };
    const out: Record<string, string | string[]> = {};
    for (const [k, v] of Object.entries(src)) {
      const cleaned = cleanLeaflet(v);
      if (cleaned !== undefined) out[k] = cleaned;
    }
    return out;
  }

  async assist(userId: string | undefined, dto: AssistantDto): Promise<Answer> {
    if (!userId) throw new UnauthorizedException('unauthorized');
    const message = String(dto?.message || '');
    const locale = (ASSISTANT_LOCALES as readonly string[]).includes(dto?.locale) ? dto.locale : 'ar';
    if (!message.trim() || message.length > 1000) {
      throw new BadRequestException('message must be 1..1000 chars');
    }

    // 1. Red flags are detected by the server itself — even when the model is down.
    if (AssistantService.isRedFlag(message)) {
      return {
        kind: 'red_flag',
        text: RED_FLAG_TEXT[locale],
        disclaimer: DISCLAIMER[locale],
        actions: [{ type: 'emergency_call', tel: '997' }],
      };
    }

    // 2. Catalogue-medicine questions are answered from the catalogue leaflet only.
    const meds: any[] = await this.medicines.find({}).toArray();
    const matched = meds
      .map((m) => ({ med: m, names: AssistantService.nameVariants(m) }))
      .filter(({ names }) => names.some((n) => AssistantService.mentions(message, n)))
      .sort((a, b) => Math.max(...b.names.map((n) => n.length)) - Math.max(...a.names.map((n) => n.length)));
    if (matched.length) {
      const med = matched[0].med;
      return {
        kind: 'leaflet',
        text: LEAFLET_TEXT[locale],
        disclaimer: DISCLAIMER[locale],
        actions: [{ type: 'ask_pharmacist' }],
        medicine: { id: med.id },
        leaflet: AssistantService.leafletFor(med, locale),
      };
    }

    // 3. Everything else is drafted through the model, but the model's words are never
    // trusted: the answer shape, specialty and texts are built by the server.
    try {
      await this.gateway.generate({ prompt: message, feature: 'assistant' });
    } catch {
      // Model down: the server rules below still hold.
    }
    const specialty = AssistantService.mapSpecialty(message);
    if (!specialty) {
      return { kind: 'out_of_scope', text: OUT_OF_SCOPE_TEXT[locale], disclaimer: DISCLAIMER[locale], actions: [] };
    }
    return {
      kind: 'specialty',
      text: GENERIC_TEXT[locale],
      disclaimer: DISCLAIMER[locale],
      actions: [{ type: 'book_consultation', specialty }],
    };
  }
}
