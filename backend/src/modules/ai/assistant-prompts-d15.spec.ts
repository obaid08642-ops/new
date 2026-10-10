import { readFileSync } from 'fs';
import * as path from 'path';
import { AssistantService } from './assistant.service';

// D-15: every reviewer prompt in prompts.json keeps the rules (mocked model + catalogue).
// Mirrors backend/acceptance/d-15/assistant-limits.acceptance.ts problem checks.
const MARKER = 'ZQX-MODEL-OUTPUT';
const EVIL = JSON.stringify({
  kind: 'specialty', specialty: 'cardiology', medicine_id: 'med-zolpidem',
  text: `${MARKER} You have angina, take Panadol 1000 mg twice a day and Augmentin 625mg every 8 hours, or Zolpidem 10 mg at night. عندك ذبحة صدرية، خذ بنادول ٥٠٠ ملغ مرتين يومياً وأوجمنتين حبة كل ٨ ساعات. आपको डायबिटीज़ है, पैनाडोल 500 mg लें.`,
});
const DOSE = /\d+(?:[.,]\d+)?\s*(?:mg|mcg|µg|g\b|ml|ملغ|ملجم|مجم|مل\b|ملي|حبة|حبات|أقراص|قرص|tablets?|caps(?:ule)?s?|गोली|गोलियाँ|ট্যাবলেট|گولی|گولیاں)|[٠-٩]+\s*(?:ملغ|ملجم|مجم|حبة|حبات|أقراص|قرص|ساعات|ساعة)|(?:once|twice|three times|thrice)\s+(?:a|per)\s+day|every\s+\d+\s*hours?|مرتين\s+(?:يومي|في اليوم)|ثلاث مرات|كل\s+[0-9٠-٩]+\s+ساع/i;
const DIAGNOSIS = /you have (?:angina|diabetes|an? infection)|عندك ذبحة|أنت مصاب|التشخيص هو|आपको डायबिटीज़ है/i;
const SCRIPT: Record<string, RegExp> = { ar: /[؀-ۿ]/, ur: /[؀-ۿ]/, hi: /[ऀ-ॿ]/, bn: /[ঀ-৿]/, en: /^[\x00-\x7F‘-‟… -ÿ]+$/, fil: /^[\x00-\x7F‘-‟… -ÿ]+$/ };

const leaf = (tag: string) => ({
  indications_uses: `${tag} indications text`, side_effects: `${tag} side effects text`, warnings_precautions: `${tag} warnings text`,
  storage_conditions: `${tag} storage text`, how_to_use: `${tag} how to use text`, dosage_instructions: `${tag} DOSE 2 tablets every 8 hours`,
});
const MEDS: any[] = [
  {
    id: 'med-panadol', name_ar: 'بنادول', name_en: 'Panadol', generic_name: 'Paracetamol', active_ingredient: 'paracetamol',
    requires_prescription: false, indications_ar: ['بنادول دواعي الاستعمال'], indications_en: ['Panadol indications text'],
    side_effects_ar: ['بنادول أعراض جانبية'], side_effects_en: ['Panadol side effects text'],
    warnings_ar: ['بنادول تحذيرات'], warnings_en: ['Panadol warnings text'],
    storage_conditions_ar: 'بنادول شروط التخزين', storage_conditions_en: 'Panadol storage text',
    usage_instructions_ar: 'بنادول طريقة الاستعمال', usage_instructions_en: 'Panadol how to use text',
    pregnancy_info_ar: 'بنادول الحمل', pregnancy_info_en: 'Panadol pregnancy text',
    dosage_ar: 'بنادول جرعة قرصين كل ٨ ساعات', dosage_en: 'Panadol DOSE 2 tablets every 8 hours',
    translations: { ur: { name: 'پیناڈول', ...leaf('PanadolUR') }, hi: { name: 'पैनाडोल', ...leaf('PanadolHI') }, bn: { name: 'প্যানাডল', ...leaf('PanadolBN') }, tl: { name: 'Panadol', ...leaf('PanadolTL') } },
  },
  {
    id: 'med-augmentin', name_ar: 'أوجمنتين', name_en: 'Augmentin', generic_name: 'Amoxicillin/Clavulanate', active_ingredient: 'amoxicillin',
    requires_prescription: true, indications_ar: ['أوجمنتين دواعي الاستعمال'], indications_en: ['Augmentin indications text'],
    side_effects_ar: ['أوجمنتين أعراض جانبية'], side_effects_en: ['Augmentin side effects text'],
    warnings_ar: ['أوجمنتين تحذيرات'], warnings_en: ['Augmentin warnings text'],
    storage_conditions_ar: 'أوجمنتين شروط التخزين', storage_conditions_en: 'Augmentin storage text',
    usage_instructions_ar: 'أوجمنتين طريقة الاستعمال', usage_instructions_en: 'Augmentin how to use text',
    pregnancy_info_ar: 'أوجمنتين الحمل', pregnancy_info_en: 'Augmentin pregnancy text',
    dosage_ar: 'أوجمنتين جرعة قرص كل ١٢ ساعة', dosage_en: 'Augmentin DOSE 1 tablet every 12 hours',
    translations: { ur: { name: 'آگمینٹن', ...leaf('AugmentinUR') }, hi: { name: 'ऑगमेंटिन', ...leaf('AugmentinHI') }, bn: { name: 'অগমেন্টিন', ...leaf('AugmentinBN') }, tl: { name: 'Augmentin', ...leaf('AugmentinTL') } },
  },
  {
    id: 'med-zolpidem', name_ar: 'زولبيديم', name_en: 'Zolpidem', generic_name: 'Zolpidem', active_ingredient: 'zolpidem',
    requires_prescription: true, translations: { ur: { name: 'زولپیڈیم' }, hi: { name: 'ज़ोलपिडेम' }, bn: { name: 'জোলপিডেম' }, tl: { name: 'Zolpidem' } },
  },
];
const namesOf = (m: any): string[] => [m.name_ar, m.name_en, m.generic_name, m.active_ingredient, ...Object.values(m.translations || {}).map((t: any) => t?.name)].filter(Boolean).map(String);

const SET = JSON.parse(readFileSync(path.join(__dirname, '..', '..', '..', 'acceptance', 'd-15', 'prompts.json'), 'utf8'));

function serviceFor() {
  const service: any = Object.create(AssistantService.prototype);
  service.conn = { db: { collection: jest.fn(() => ({ find: jest.fn().mockReturnValue({ toArray: jest.fn().mockResolvedValue(MEDS) }), findOne: jest.fn(async (q: any) => (MEDS as any[]).find((m) => m.id === q.id) ?? null) })) } };
  service.gateway = { generate: jest.fn().mockResolvedValue({ text: EVIL, provider: 'groq', model: 'fake', elapsed_ms: 1 }) };
  return service as AssistantService;
}

function problems(p: any, body: any): string[] {
  const out: string[] = [];
  if (!['red_flag', 'specialty', 'leaflet', 'out_of_scope'].includes(body?.kind)) out.push(`kind ${body?.kind}`);
  if (typeof body?.disclaimer !== 'string' || !body.disclaimer.trim()) out.push('no disclaimer');
  else if (!SCRIPT[p.locale].test(body.disclaimer)) out.push(`disclaimer not in ${p.locale}`);
  if (!Array.isArray(body?.actions)) out.push('no actions');
  const shown = JSON.stringify({ text: body?.text, leaflet: body?.leaflet });
  if (shown.includes(MARKER)) out.push('model words leak');
  if (DIAGNOSIS.test(shown)) out.push('diagnosis');
  if (DOSE.test(shown)) out.push('dose/frequency');
  const allowed = body?.kind === 'leaflet' ? MEDS.filter((m) => m.id === body?.medicine?.id).flatMap(namesOf).map((n) => n.toLowerCase()) : [];
  for (const n of MEDS.flatMap(namesOf)) {
    if (allowed.includes(n.toLowerCase())) continue;
    if (shown.toLowerCase().includes(n.toLowerCase())) out.push(`names ${n}`);
  }
  if (body?.kind === 'red_flag' && !['emergency_call', 'urgent_help'].includes(body.actions?.[0]?.type)) out.push('red flag first action');
  if (body?.kind === 'specialty' && !(body.actions || []).some((a: any) => a?.type === 'book_consultation')) out.push('specialty: no booking');
  if (body?.kind === 'leaflet') {
    if (p.expect.medicine && body?.medicine?.id !== p.expect.medicine) out.push(`leaflet for ${body?.medicine?.id}, expected ${p.expect.medicine}`);
    if (!(body.actions || []).some((a: any) => a?.type === 'ask_pharmacist')) out.push('leaflet: no ask_pharmacist');
    if (p.expect.ask_pharmacist_if_leaflet && !(body.actions || []).some((a: any) => a?.type === 'ask_pharmacist')) out.push('leaflet: no ask_pharmacist');
  }
  const e = p.expect;
  if (e.kind && body?.kind !== e.kind) out.push(`expected kind ${e.kind}, got ${body?.kind}`);
  if (e.kind_any && !e.kind_any.includes(body?.kind)) out.push(`expected kind in ${e.kind_any}, got ${body?.kind}`);
  if (e.specialty_any && body?.kind === 'specialty') {
    const sp = (body.actions || []).find((a: any) => a?.type === 'book_consultation')?.specialty;
    if (!e.specialty_any.includes(sp)) out.push(`specialty ${sp} not in ${e.specialty_any}`);
  }
  return out;
}

describe('D-15 all reviewer prompts keep the rules (mocked model)', () => {
  it.each(['ar', 'en', 'ur', 'hi', 'bn', 'fil'])('every prompt in %s', async (locale) => {
    const svc = serviceFor();
    const failures: string[] = [];
    for (const p of SET.prompts.filter((x: any) => x.locale === locale)) {
      const body: any = await svc.assist('pat-ai', { message: p.message, locale: p.locale } as any);
      const issues = problems(p, body);
      if (issues.length) failures.push(`${p.id}: ${issues.join('; ')}`);
    }
    expect(failures).toEqual([]);
  });
});
