import { NextResponse } from "next/server";

const origin = (process.env.NEXT_PUBLIC_SITE_ORIGIN || "https://nabd.plus").replace(/\/$/, "");

const catalog = {
  specVersion: "1.0",
  host: {
    displayName: "Nabd Plus",
    identifier: "did:web:nabd.plus"
  },
  entries: [
    {
      id: "urn:air:nabd.plus:catalog:products",
      identifier: "urn:air:nabd.plus:catalog:products",
      displayName: "Real-time AI product catalog and availability feed",
      type: "application/json",
      url: `${origin}/api/v1/public/ai-catalog/products`,
      representativeQueries: [
        "What medicines and OTC products are available?",
        "Find product prices and active ingredients.",
        "ما هي الأدوية والمستحضرات المتوفرة مع الأسعار الرسمية؟",
        "دواؤں کی قیمتیں اور دستیابی تلاش کریں",
        "दवाओं की कीमतें और उपलब्धता खोजें",
        "ওষুধের দাম এবং প্রাপ্যতা খুঁজুন",
        "Maghanap ng mga gamot at opisyal na presyo sa botika."
      ]
    },
    {
      id: "urn:air:nabd.plus:catalog:categories",
      identifier: "urn:air:nabd.plus:catalog:categories",
      displayName: "Multi-lingual category tree across 6 languages",
      type: "application/json",
      url: `${origin}/api/v1/public/categories/ar`,
      representativeQueries: [
        "Browse healthcare categories.",
        "استعراض تصنيفات الصيدلية والرعاية الصحية",
        "صحت کی دیکھ بھال کے زمرے براؤز کریں",
        "स्वास्थ्य सेवा श्रेणियों को ब्राउज़ करें",
        "স্বাস্থ্যসেবা বিভাগ ব্রাউজ করুন",
        "I-browse ang mga kategorya ng pangangalagang pangkalusugan."
      ]
    },
    {
      id: "urn:air:nabd.plus:consultations:doctors",
      identifier: "urn:air:nabd.plus:consultations:doctors",
      displayName: "Doctor consultations: Video, Clinic visit, and Home visit",
      type: "application/json",
      url: `${origin}/api/v1/doctors`,
      representativeQueries: [
        "Find verified doctors, clinics, and hospital networks in Saudi Arabia.",
        "Check doctor consultation fees for video, clinic, or home visit.",
        "ابحث عن أطباء معتمدين للاستشارة المرئية أو زيارة العيادة أو الزيارة المنزلية",
        "ویڈیو، کلینک، یا گھر کے دورے کے لیے ڈاکٹر تلاش کریں",
        "वीडियो, क्लिनिक या होम विजिट के लिए डॉक्टर खोजें",
        "ভিডিও, ক্লিনিক বা হোম ভিজিটের জন্য ডাক্তার খুঁজুন",
        "Maghanap ng mga doktor para sa video, klinika, o pagbisita sa bahay."
      ]
    },
    {
      id: "urn:air:nabd.plus:consultations:booking",
      identifier: "urn:air:nabd.plus:consultations:booking",
      displayName: "Doctor appointment booking API (Cash & Insurance)",
      type: "application/json",
      url: `${origin}/api/appointments/book`,
      representativeQueries: [
        "How to book a doctor consultation online?",
        "حجز موعد طبيب عبر الدفع الذاتي أو التأمين الصحي",
        "ڈاکٹر کے ساتھ اپائنٹمنٹ بک کریں",
        "डॉक्टर के साथ अपॉइंटमेंट बुक करें",
        "ডাক্তারের সাথে অ্যাপয়েন্টমেন্ট বুক করুন",
        "Mag-book ng appointment sa doktor gamit ang cash o insurance."
      ]
    },
    {
      id: "urn:air:nabd.plus:diagnostics:labs",
      identifier: "urn:air:nabd.plus:diagnostics:labs",
      displayName: "Laboratory diagnostics: Home sample collection & Lab visits",
      type: "application/json",
      url: `${origin}/api/v1/labs/services`,
      representativeQueries: [
        "Book laboratory blood tests with home sample collection.",
        "حجز تحاليل مخبرية مع خدمة سحب العينات من المنزل أو زيارة المختبر",
        "گھر پر نمونہ جمع کرنے کے ساتھ لیب ٹیسٹ بک کریں",
        "घर पर सैंपल कलेक्शन के साथ लैब टेस्ट बुक करें",
        "বাড়ি থেকে নমুনা সংগ্রহের সাথে ল্যাব পরীক্ষা বুক করুন",
        "Mag-book ng mga pagsusuri sa laboratoryo na may koleksyon sa bahay."
      ]
    },
    {
      id: "urn:air:nabd.plus:diagnostics:radiology",
      identifier: "urn:air:nabd.plus:diagnostics:radiology",
      displayName: "Radiology scans & medical imaging catalog",
      type: "application/json",
      url: `${origin}/api/v1/radiology/services`,
      representativeQueries: [
        "Find MRI, CT scans, and X-ray services in licensed imaging centers.",
        "استعراض خدمات الأشعة التشخيصية (رنين مغناطيسي، أشعة سينية، سونار)",
        "ریڈیولوجی اور اسکین کی خدمات تلاش کریں",
        "रेडियोलॉजी और स्कैन सेवाएं खोजें",
        "রেডিওলজি এবং স্ক্যান পরিষেবা খুঁজুন",
        "Maghanap ng mga serbisyo ng radiology at scan."
      ]
    },
    {
      id: "urn:air:nabd.plus:care:nursing",
      identifier: "urn:air:nabd.plus:care:nursing",
      displayName: "Published home nursing and elderly care catalog",
      type: "application/json",
      url: `${origin}/api/v1/home-care/services`,
      representativeQueries: [
        "What licensed home nursing services are available?",
        "خدمات التمريض المنزلي المعتمدة ورعاية كبار السن وتبديل الجروح",
        "گھریلو نرسنگ کی خدمات",
        "होम नर्सिंग सेवाएं खोजें",
        "হোম নার্সিং সেবা খুঁজুন",
        "Mga lisensyadong serbisyo ng home nursing at pangangalaga sa matatanda."
      ]
    },
    {
      id: "urn:air:nabd.plus:commerce:checkout-session",
      identifier: "urn:air:nabd.plus:commerce:checkout-session",
      displayName: "AI Agent Checkout Session Hand-off API",
      type: "application/json",
      url: `${origin}/api/v1/public/ai-commerce/checkout-session`,
      representativeQueries: [
        "Create a secure checkout session for patient order.",
        "Hand off prepared medical cart to patient for final payment.",
        "إنشاء رابط جلسة دفع آمن لسلة المشتريات الطبية",
        "محفوظ چیک آؤٹ سیشن بنائیں",
        "सुरक्षित चेकआउट सत्र बनाएं",
        "নিরাপদ চেকআউট সেশন তৈরি করুন",
        "Gumawa ng ligtas na sesyon ng pag-checkout para sa pasyente."
      ]
    },
    {
      id: "urn:air:nabd.plus:payments:modalities",
      identifier: "urn:air:nabd.plus:payments:modalities",
      displayName: "Payment modalities: Hosted payment gateway vs Insurance approval",
      type: "application/json",
      url: `${origin}/api/appointments/payment-capabilities`,
      representativeQueries: [
        "What payment methods and insurance companies are supported?",
        "طرق الدفع الإلكتروني (مدى، فيزا، ماستركارد، تابي، تمارا) وشركات التأمين المعتمدة",
        "ادائیگی کے طریقے اور انشورنس سپورٹ",
        "भुगतान के तरीके और बीमा सहायता",
        "পেমেন্ট পদ্ধতি এবং বীমা সমর্থন",
        "Mga paraan ng pagbabayad at suportadong insurance."
      ]
    },
    {
      id: "urn:air:nabd.plus:lifecycle:management",
      identifier: "urn:air:nabd.plus:lifecycle:management",
      displayName: "Appointment lifecycle: Rescheduling and cancellation APIs",
      type: "application/json",
      url: `${origin}/openapi.json`,
      representativeQueries: [
        "How can a patient reschedule or cancel an appointment?",
        "إعادة جدولة أو إلغاء موعد كشف أو فحص مخبري",
        "ملاقات کو دوبارہ شیڈول یا منسوخ کریں",
        "अपॉइंटमेंट को पुनर्निर्धारित या रद्द करें",
        "অ্যাপয়েন্টমেন্ট পুনর্নির্ধারণ বা বাতিল করুন",
        "Mag-reschedule o magkansela ng appointment."
      ]
    },
    {
      id: "urn:air:nabd.plus:documentation:public-boundaries",
      identifier: "urn:air:nabd.plus:documentation:public-boundaries",
      displayName: "Saudi PDPL privacy boundaries and public AI discovery documentation",
      type: "text/markdown",
      url: `${origin}/auth.md`,
      representativeQueries: [
        "What public Nabd Plus content can an agent access?",
        "Which patient health data requires authenticated OAuth 2.0 sessions under Saudi PDPL?",
        "سياسة خصوصية البيانات وحماية البيانات الصحية الشخصية (PDPL)"
      ]
    }
  ]
} as const;

export function GET() {
  return NextResponse.json(catalog, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
      "Cache-Control": "public, max-age=900, stale-while-revalidate=3600",
      "Content-Type": "application/json; charset=utf-8",
      "X-Content-Type-Options": "nosniff"
    }
  });
}
