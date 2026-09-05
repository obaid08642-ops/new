"use client";

import { useEffect } from "react";
import type { Locale } from "@/lib/i18n";

interface WebMcpProviderProps {
  locale: Locale;
}

const DESCRIPTIONS: Record<string, Record<Locale, string>> = {
  search_medicines: {
    ar: "البحث في كتالوج صيدلية نبض بلس عن الأدوية، الأسعار، والمستحضرات الطبية المرخصة في المملكة.",
    en: "Search Nabd Plus pharmacy catalog for verified medications, prices, and therapeutic formulations in Saudi Arabia.",
    ur: "سعودی عرب میں مصدقہ ادویات، قیمتوں اور طبی فارمولیشنز کے لیے نبض پلس فارمیسی کیٹلاگ تلاش کریں۔",
    hi: "सऊदी अरब में सत्यापित दवाओं, कीमतों और चिकित्सा योगों के लिए नब्ज़ प्लस फ़ार्मेसी कैटलॉग खोजें।",
    bn: "সৌদি আরবে যাচাইকৃত ওষুধ, দাম এবং ফর্মুলেশনের জন্য নবজ প্লাস ফার্মেসি ক্যাটালগ অনুসন্ধান করুন।",
    fil: "Maghanap sa catalog ng parmasya ng Nabd Plus para sa mga lisensyadong gamot, presyo, at pormulasyon sa Saudi Arabia.",
  },
  browse_categories: {
    ar: "استعراض تصنيفات الرعاية الصحية والصيدلية المعتمدة (أدوية وعلاجات، فيتامينات، عناية بالبشرة، إلخ).",
    en: "Browse accredited healthcare and pharmacy categories (medications, vitamins, skincare, maternal care, etc.).",
    ur: "تسلیم شدہ صحت کی دیکھ بھال اور فارمیسی کے زمرے براؤز کریں۔",
    hi: "मान्यता प्राप्त स्वास्थ्य सेवा और फार्मेसी श्रेणियों को ब्राउज़ करें।",
    bn: "স্বীকৃত স্বাস্থ্যসেবা এবং ফার্মেসি বিভাগ ব্রাউজ করুন।",
    fil: "I-browse ang mga kinikilalang kategorya ng pangangalagang pangkalusugan at parmasya.",
  },
  find_doctors: {
    ar: "البحث عن الأطباء المعتمدين وحجز الاستشارات (عبر الفيديو، زيارة العيادة، أو الزيارة المنزلية).",
    en: "Search verified licensed doctors, specialties, and consultation slots (video, clinic visit, or home visit).",
    ur: "مصدقہ ڈاکٹرز تلاش کریں اور مشورے کے اوقات بک کریں (ویڈیو، کلینک کا دورہ، یا گھر کا دورہ)۔",
    hi: "सत्यापित डॉक्टरों को खोजें और परामर्श बुक करें (वीडियो, क्लिनिक विज़िट, या होम विज़िट)।",
    bn: "যাচাইকৃত ডাক্তারদের খুঁজুন এবং পরামর্শ বুক করুন (ভিডিও, ক্লিনিক ভিজিট, বা হোম ভিজিট)।",
    fil: "Maghanap ng mga lisensyadong doktor at mag-book ng konsultasyon (video, klinika, o pagbisita sa bahay).",
  },
  get_diagnostics_tests: {
    ar: "استعراض الفحوصات المخبرية والأشعة التشخيصية مع خيارات سحب العينات منزلياً أو زيارة المراكز.",
    en: "Retrieve diagnostic laboratory tests and radiology scans with home sample collection or center visit options.",
    ur: "گھر پر نمونے جمع کرنے یا سینٹر وزٹ کے اختیارات کے ساتھ تشخیصی لیب ٹیسٹ اور ریڈیولوجی اسکینز حاصل کریں۔",
    hi: "घर पर सैंपल कलेक्शन या सेंटर विज़िट विकल्पों के साथ लैब टेस्ट और रेडियोलॉजी स्कैन प्राप्त करें।",
    bn: "হোম স্যাম্পল কালেকশন বা সেন্টার ভিজিট বিকল্পসহ ডায়াগনস্টিক ল্যাব পরীক্ষা এবং রেডিওলজি স্ক্যান দেখুন।",
    fil: "Kunin ang mga diagnostic test sa laboratoryo at scan sa radiology na may koleksyon sa bahay o pagbisita sa center.",
  },
  get_nursing_services: {
    ar: "استعراض خدمات التمريض والرعاية المنزلية المرخصة ومواعيد الزيارات المباشرة.",
    en: "Retrieve accredited home nursing services, elderly care packages, and home nurse visit bookings.",
    ur: "تسلیم شدہ ہوم نرسنگ خدمات اور بزرگوں کی دیکھ بھال کے پیکیجز حاصل کریں۔",
    hi: "मान्यता प्राप्त होम नर्सिंग सेवाओं और बुजुर्गों की देखभाल के पैकेज प्राप्त करें।",
    bn: "অনুমোদিত হোম নার্সিং সেবা এবং বয়স্কদের যত্ন প্যাকেজ খুঁজুন।",
    fil: "Kunin ang mga serbisyo ng home nursing at mga package ng pangangalaga sa matatanda.",
  },
};

/**
 * WebMCP Client Provider (W3C Web Machine Learning Working Group / Chrome WebMCP EPP)
 * Exposes core site tools directly to in-browser AI assistants via navigator.modelContext
 * with native 6-language support (ar, en, ur, bn, hi, fil).
 */
export function WebMcpProvider({ locale }: WebMcpProviderProps) {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const nav = window.navigator as any;
    const modelCtx = nav?.modelContext || (window as any).modelContext;

    if (!modelCtx) {
      if (!nav.modelContext) {
        nav.modelContext = {
          _tools: new Map<string, any>(),
          registerTool(tool: any) {
            this._tools.set(tool.name, tool);
            return {
              unregister: () => {
                this._tools.delete(tool.name);
              },
            };
          },
          provideContext(options: any) {
            if (Array.isArray(options?.tools)) {
              for (const tool of options.tools) {
                this.registerTool(tool);
              }
            }
            return {
              unregister: () => {
                if (Array.isArray(options?.tools)) {
                  for (const tool of options.tools) {
                    this._tools.delete(tool.name);
                  }
                }
              },
            };
          },
          getTools() {
            return Array.from(this._tools.values());
          },
        };
      }
    }

    const activeModelCtx = nav.modelContext;
    const activeLocale = locale || "ar";

    // 1. Search Medicines Tool
    const searchMedicinesTool = {
      name: "search_medicines",
      description: DESCRIPTIONS.search_medicines[activeLocale] || DESCRIPTIONS.search_medicines.en,
      inputSchema: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "The medicine trade name, active ingredient, or medical symptom.",
          },
          lang: {
            type: "string",
            enum: ["ar", "en", "ur", "bn", "hi", "fil"],
            description: "Optional language override for returned results.",
          },
        },
        required: ["query"],
      },
      execute: async ({ query, lang }: { query: string; lang?: Locale }) => {
        try {
          const targetLang = lang || activeLocale;
          const res = await fetch(`/api/v1/public/products/search?q=${encodeURIComponent(query)}&locale=${targetLang}`);
          if (!res.ok) throw new Error(`Status ${res.status}`);
          const data = await res.json();
          return { success: true, results: data?.items || [] };
        } catch (err: any) {
          return { success: false, error: err?.message || "Search failed" };
        }
      },
    };

    // 2. Browse Healthcare Categories Tool
    const browseCategoriesTool = {
      name: "browse_categories",
      description: DESCRIPTIONS.browse_categories[activeLocale] || DESCRIPTIONS.browse_categories.en,
      inputSchema: {
        type: "object",
        properties: {
          lang: {
            type: "string",
            enum: ["ar", "en", "ur", "bn", "hi", "fil"],
            description: "Optional language code.",
          },
        },
      },
      execute: async ({ lang }: { lang?: Locale } = {}) => {
        try {
          const targetLang = lang || activeLocale;
          const res = await fetch(`/api/v1/public/categories/${targetLang}`);
          if (!res.ok) throw new Error(`Status ${res.status}`);
          const data = await res.json();
          return { success: true, categories: data?.categories || [] };
        } catch (err: any) {
          return { success: false, error: err?.message || "Failed to load categories" };
        }
      },
    };

    // 3. Search Verified Doctors Tool (Video, Clinic, Home Visit)
    const findDoctorsTool = {
      name: "find_doctors",
      description: DESCRIPTIONS.find_doctors[activeLocale] || DESCRIPTIONS.find_doctors.en,
      inputSchema: {
        type: "object",
        properties: {
          specialty: {
            type: "string",
            description: "Medical specialty (e.g. cardiology, pediatrics, dermatology, family_medicine).",
          },
          type: {
            type: "string",
            enum: ["video", "clinic", "home"],
            description: "Consultation modality: video (telehealth), clinic visit, or doctor home visit.",
          },
          lang: {
            type: "string",
            enum: ["ar", "en", "ur", "bn", "hi", "fil"],
          },
        },
      },
      execute: async ({ specialty, type, lang }: { specialty?: string; type?: string; lang?: Locale }) => {
        try {
          const targetLang = lang || activeLocale;
          const params = new URLSearchParams({ locale: targetLang });
          if (specialty) params.set("specialty", specialty);
          if (type) params.set("type", type);
          const res = await fetch(`/api/v1/doctors?${params.toString()}`);
          if (!res.ok) throw new Error(`Status ${res.status}`);
          const data = await res.json();
          return { success: true, doctors: data?.doctors || [] };
        } catch (err: any) {
          return { success: false, error: err?.message || "Failed to find doctors" };
        }
      },
    };

    // 4. Lab & Radiology Diagnostics Tool
    const getDiagnosticsTool = {
      name: "get_diagnostics_tests",
      description: DESCRIPTIONS.get_diagnostics_tests[activeLocale] || DESCRIPTIONS.get_diagnostics_tests.en,
      inputSchema: {
        type: "object",
        properties: {
          category: {
            type: "string",
            description: "Filter tests by category (e.g. general, diabetes, thyroid, cardiac, vitamins, radiology).",
          },
          homeCollectionOnly: {
            type: "boolean",
            description: "If true, returns only tests with home sample collection support.",
          },
          lang: {
            type: "string",
            enum: ["ar", "en", "ur", "bn", "hi", "fil"],
          },
        },
      },
      execute: async ({ category, homeCollectionOnly, lang }: { category?: string; homeCollectionOnly?: boolean; lang?: Locale }) => {
        try {
          const targetLang = lang || activeLocale;
          const params = new URLSearchParams({ locale: targetLang });
          if (category) params.set("category", category);
          if (homeCollectionOnly) params.set("home_collection", "true");
          const res = await fetch(`/api/v1/labs/services?${params.toString()}`);
          if (!res.ok) throw new Error(`Status ${res.status}`);
          const data = await res.json();
          return { success: true, tests: data?.services || [] };
        } catch (err: any) {
          return { success: false, error: err?.message || "Failed to retrieve tests" };
        }
      },
    };

    // 5. Home Nursing Services Tool
    const getNursingServicesTool = {
      name: "get_nursing_services",
      description: DESCRIPTIONS.get_nursing_services[activeLocale] || DESCRIPTIONS.get_nursing_services.en,
      inputSchema: {
        type: "object",
        properties: {
          lang: {
            type: "string",
            enum: ["ar", "en", "ur", "bn", "hi", "fil"],
          },
        },
      },
      execute: async ({ lang }: { lang?: Locale } = {}) => {
        try {
          const targetLang = lang || activeLocale;
          const res = await fetch(`/api/v1/home-care/services?locale=${targetLang}`);
          if (!res.ok) throw new Error(`Status ${res.status}`);
          const data = await res.json();
          return { success: true, services: data?.services || [] };
        } catch (err: any) {
          return { success: false, error: err?.message || "Failed to retrieve nursing services" };
        }
      },
    };

    const tools = [
      searchMedicinesTool,
      browseCategoriesTool,
      findDoctorsTool,
      getDiagnosticsTool,
      getNursingServicesTool,
    ];

    try {
      if (typeof activeModelCtx.provideContext === "function") {
        activeModelCtx.provideContext({ tools });
      } else if (typeof activeModelCtx.registerTool === "function") {
        tools.forEach((tool) => activeModelCtx.registerTool(tool));
      }
    } catch {
      // Graceful fallback
    }
  }, [locale]);

  return null;
}
