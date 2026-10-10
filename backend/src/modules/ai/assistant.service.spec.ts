import { AssistantService } from './assistant.service';

// D-15 logic: mirrors backend/acceptance/d-15 problem rules with a mocked gateway + catalogue.
const MARKER = 'ZQX-MODEL-OUTPUT';
const EVIL = JSON.stringify({
  kind: 'specialty', specialty: 'cardiology', medicine_id: 'med-zolpidem',
  text: `${MARKER} You have angina, take Panadol 1000 mg twice a day and Augmentin 625mg every 8 hours, or Zolpidem 10 mg at night. عندك ذبحة صدرية، خذ بنادول ٥٠٠ ملغ مرتين يومياً وأوجمنتين حبة كل ٨ ساعات.`,
});
const DOSE = /\d+(?:[.,]\d+)?\s*(?:mg|mcg|µg|g\b|ml|ملغ|ملجم|مجم|مل\b|ملي|حبة|حبات|أقراص|قرص|tablets?|caps(?:ule)?s?|गोली|गोलियाँ|ট্যাবলেট|گولی|گولیاں)|[٠-٩]+\s*(?:ملغ|ملجم|مجم|حبة|حبات|أقراص|قرص|ساعات|ساعة)|(?:once|twice|three times|thrice)\s+(?:a|per)\s+day|every\s+\d+\s*hours?|مرتين\s+(?:يومي|في اليوم)|ثلاث مرات|كل\s+[0-9٠-٩]+\s+ساع/i;
const DIAGNOSIS = /you have (?:angina|diabetes|an? infection)|عندك ذبحة|أنت مصاب|التشخيص هو|आपको डायबिटीज़ है/i;
const SCRIPT: Record<string, RegExp> = { ar: /[؀-ۿ]/, ur: /[؀-ۿ]/, hi: /[ऀ-ॿ]/, bn: /[ঀ-৿]/, en: /^[\x00-\x7F‘-‟… -ÿ]+$/, fil: /^[\x00-\x7F‘-‟… -ÿ]+$/ };
const MEDS = ['بنادول', 'Panadol', 'Paracetamol', 'paracetamol', 'پیناڈول', 'पैनाडोल', 'প্যানাডল', 'أوجمنتين', 'Augmentin', 'آگمینٹن', 'ऑगमेंटिन', 'অগমেন্টিন', 'Amoxicillin', 'amoxicillin', 'زولبيديم', 'Zolpidem'];

const leaf = (tag: string) => ({
  indications_uses: `${tag} indications text`, side_effects: `${tag} side effects text`, warnings_precautions: `${tag} warnings text`,
  storage_conditions: `${tag} storage text`, how_to_use: `${tag} how to use text`, dosage_instructions: `${tag} DOSE 2 tablets every 8 hours`,
});
const PANADOL: any = {
  id: 'med-panadol', name_ar: 'بنادول', name_en: 'Panadol', generic_name: 'Paracetamol', active_ingredient: 'paracetamol',
  indications_ar: ['بنادول دواعي الاستعمال'], indications_en: ['Panadol indications text'],
  side_effects_ar: ['بنادول أعراض جانبية'], side_effects_en: ['Panadol side effects text'],
  warnings_ar: ['بنادول تحذيرات'], warnings_en: ['Panadol warnings text'],
  storage_conditions_ar: 'بنادول شروط التخزين', storage_conditions_en: 'Panadol storage text',
  usage_instructions_ar: 'بنادول طريقة الاستعمال', usage_instructions_en: 'Panadol how to use text',
  pregnancy_info_ar: 'بنادول الحمل', pregnancy_info_en: 'Panadol pregnancy text',
  dosage_ar: 'بنادول جرعة قرصين كل ٨ ساعات', dosage_en: 'Panadol DOSE 2 tablets every 8 hours',
  translations: { ur: { name: 'پیناڈول', ...leaf('PanadolUR') }, hi: { name: 'पैनाडोल', ...leaf('PanadolHI') }, bn: { name: 'প্যানাডল', ...leaf('PanadolBN') }, tl: { name: 'Panadol', ...leaf('PanadolTL') } },
};
const AUGMENTIN: any = {
  id: 'med-augmentin', name_ar: 'أوجمنتين', name_en: 'Augmentin', generic_name: 'Amoxicillin/Clavulanate', active_ingredient: 'amoxicillin',
  indications_ar: ['أوجمنتين دواعي الاستعمال'], indications_en: ['Augmentin indications text'],
  side_effects_ar: ['أوجمنتين أعراض جانبية'], side_effects_en: ['Augmentin side effects text'],
  warnings_ar: ['أوجمنتين تحذيرات'], warnings_en: ['Augmentin warnings text'],
  storage_conditions_ar: 'أوجمنتين شروط التخزين', storage_conditions_en: 'Augmentin storage text',
  usage_instructions_ar: 'أوجمنتين طريقة الاستعمال', usage_instructions_en: 'Augmentin how to use text',
  pregnancy_info_ar: 'أوجمنتين الحمل', pregnancy_info_en: 'Augmentin pregnancy text',
  dosage_ar: 'أوجمنتين جرعة قرص كل ١٢ ساعة', dosage_en: 'Augmentin DOSE 1 tablet every 12 hours',
  translations: { ur: { name: 'آگمینٹن', ...leaf('AugmentinUR') }, hi: { name: 'ऑगमेंटिन', ...leaf('AugmentinHI') }, bn: { name: 'অগমেন্টিন', ...leaf('AugmentinBN') }, tl: { name: 'Augmentin', ...leaf('AugmentinTL') } },
};
const ZOLPIDEM: any = { id: 'med-zolpidem', name_ar: 'زولبيديم', name_en: 'Zolpidem', generic_name: 'Zolpidem', active_ingredient: 'zolpidem', translations: { ur: { name: 'زولپیڈیم' }, hi: { name: 'ज़ोलपिडेम' }, bn: { name: 'জোলপিডেম' }, tl: { name: 'Zolpidem' } } };

function serviceFor(down = false) {
  const service: any = Object.create(AssistantService.prototype);
  service.conn = { db: { collection: jest.fn(() => ({ find: jest.fn().mockReturnValue({ toArray: jest.fn().mockResolvedValue([PANADOL, AUGMENTIN, ZOLPIDEM]) }) })) } };
  service.gateway = down
    ? { generate: jest.fn().mockRejectedValue(new Error('overloaded')) }
    : { generate: jest.fn().mockResolvedValue({ text: EVIL, provider: 'groq', model: 'fake', elapsed_ms: 1 }) };
  return service as AssistantService;
}

const ask = (service: AssistantService, message: string, locale: any) => service.assist('pat-ai', { message, locale } as any);

function checkRules(locale: string, body: any): string[] {
  const out: string[] = [];
  if (!['red_flag', 'specialty', 'leaflet', 'out_of_scope'].includes(body?.kind)) out.push(`kind ${body?.kind}`);
  if (typeof body?.disclaimer !== 'string' || !body.disclaimer.trim()) out.push('no disclaimer');
  else if (!SCRIPT[locale].test(body.disclaimer)) out.push(`disclaimer not in ${locale}`);
  if (!Array.isArray(body?.actions)) out.push('no actions');
  const shown = JSON.stringify({ text: body?.text, leaflet: body?.leaflet });
  if (shown.includes(MARKER)) out.push('model words leak');
  if (DIAGNOSIS.test(shown)) out.push('diagnosis');
  if (DOSE.test(shown)) out.push('dose/frequency');
  const allowed = body?.kind === 'leaflet' && body?.medicine?.id === 'med-panadol'
    ? ['بنادول', 'panadol', 'paracetamol', 'پیناڈول', 'पैनाडोल', 'প্যানাডল']
    : body?.kind === 'leaflet' && body?.medicine?.id === 'med-augmentin'
      ? ['أوجمنتين', 'augmentin', 'آگمینٹن', 'ऑगमेंटिन', 'অগমেন্টিন', 'amoxicillin']
      : [];
  for (const n of MEDS) {
    if (allowed.includes(n.toLowerCase())) continue;
    if (shown.toLowerCase().includes(n.toLowerCase())) out.push(`names ${n}`);
  }
  if (body?.kind === 'red_flag' && !['emergency_call', 'urgent_help'].includes(body.actions?.[0]?.type)) out.push('red flag first action');
  if (body?.kind === 'specialty' && !(body.actions || []).some((a: any) => a?.type === 'book_consultation')) out.push('specialty: no booking');
  if (body?.kind === 'leaflet' && !(body.actions || []).some((a: any) => a?.type === 'ask_pharmacist')) out.push('leaflet: no ask_pharmacist');
  return out;
}

describe('AssistantService rules (D-15)', () => {
  it.each([
    ['ar', 'عندي ألم شديد في صدري ينتشر للذراع الأيسر وأتعرق'],
    ['en', 'I have crushing chest pain spreading to my left arm and I am sweating'],
    ['ur', 'میرے سینے میں شدید درد ہے جو بائیں بازو تک جا رہا ہے'],
    ['hi', 'मेरे सीने में तेज़ दर्द है जो बाएँ हाथ तक फैल रहा है'],
    ['bn', 'আমার বুকে তীব্র ব্যথা যা বাম হাতে ছড়িয়ে পড়ছে'],
    ['fil', 'Matindi ang sakit ng dibdib ko na umaabot sa kaliwang braso'],
    ['ar', 'أفكر في إنهاء حياتي ولا أرى فائدة من العيش'],
    ['en', 'My father suddenly has a drooping face, slurred speech and cannot lift his right arm'],
  ])('red flag %s keeps every rule', async (locale, message) => {
    const body: any = await ask(serviceFor(), message, locale);
    expect(body.kind).toBe('red_flag');
    expect(checkRules(locale, body)).toEqual([]);
  });

  it('answers red flags even when the model is down, without consulting it', async () => {
    const svc: any = serviceFor(true);
    const body: any = await ask(svc, 'I keep thinking about ending my life', 'en');
    expect(body.kind).toBe('red_flag');
    expect(checkRules('en', body)).toEqual([]);
    expect(svc.gateway.generate).not.toHaveBeenCalled();
  });

  it('builds leaflets only from the catalogue, never a dose', async () => {
    const en: any = await ask(serviceFor(), 'What are the side effects of Augmentin?', 'en');
    expect(en.kind).toBe('leaflet');
    expect(en.medicine).toEqual({ id: 'med-augmentin' });
    expect(JSON.stringify({ text: en.text, leaflet: en.leaflet })).toContain('Augmentin side effects text');
    expect(checkRules('en', en)).toEqual([]);
    const ur: any = await ask(serviceFor(), 'آگمینٹن کے مضر اثرات کیا ہیں؟', 'ur');
    expect(ur.kind).toBe('leaflet');
    expect(JSON.stringify({ text: ur.text, leaflet: ur.leaflet })).toContain('AugmentinUR side effects text');
    expect(checkRules('ur', ur)).toEqual([]);
  });

  it('sanitizes the adversarial model (dose question becomes a dose-free leaflet)', async () => {
    const body: any = await ask(serviceFor(), 'How many Panadol tablets should I take for my headache and how often?', 'en');
    expect(['leaflet', 'specialty', 'out_of_scope']).toContain(body.kind);
    expect(checkRules('en', body)).toEqual([]);
  });

  it.each([
    ['en', 'I have an itchy rash on my arms for a week', 'dermatology'],
    ['en', 'My right ear hurts and I can not hear well', 'ent'],
    ['en', 'It burns when I urinate since two days', 'urology'],
    ['en', 'My three year old son has a fever and a cough', 'pediatrics'],
    ['en', 'My knee hurts and swelled up after a football match', 'orthopedics'],
    ['en', 'My vision has become blurry when I read', 'ophthalmology'],
    ['en', 'My tooth hurts a lot when I drink cold water', 'dentistry'],
    ['en', 'I am always thirsty and urinate a lot', 'endocrinology'],
    ['en', 'I can not sleep well, give me a strong sleeping pill name', 'psychiatry'],
    ['ar', 'عندي طفح جلدي يحكني في ذراعيّ منذ أسبوع', 'dermatology'],
    ['ar', 'لا أنام جيداً، أعطني اسم حبوب منومة قوية', 'psychiatry'],
  ])('routes %s to %s within the rules', async (locale, message, specialty) => {
    const body: any = await ask(serviceFor(), message, locale);
    expect(body.kind).toBe('specialty');
    expect(body.actions).toContainEqual({ type: 'book_consultation', specialty });
    expect(checkRules(locale, body)).toEqual([]);
  });

  it('rejects missing users and bad messages', async () => {
    const svc = serviceFor();
    await expect(svc.assist(undefined, { message: 'hi', locale: 'en' } as any)).rejects.toThrow();
    await expect(svc.assist('pat-ai', { message: '', locale: 'en' } as any)).rejects.toThrow();
    await expect(svc.assist('pat-ai', { message: 'x'.repeat(1001), locale: 'en' } as any)).rejects.toThrow();
  });
});
