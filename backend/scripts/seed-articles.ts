// @ts-nocheck
/**
 * M6 / SEO-2 seed: three starter health articles (published) so the public
 * articles hub works end-to-end immediately. Admin can edit via /admin/articles.
 * Run: npx ts-node scripts/seed-articles.ts
 */
import mongoose from 'mongoose';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/nabdah';

const ARTICLES = [
  {
    slug: 'sihat-qlbk',
    title_ar: 'صحة قلبك: 7 عادات يومية تحميك من أمراض القلب',
    title_en: 'Heart health: 7 daily habits that protect you',
    excerpt_ar: 'أمراض القلب من أكثر أسباب الوفيات شيوعًا في المملكة — لكن أغلبها قابل للوقاية بعادات بسيطة.',
    body_ar: 'أمراض القلب والأوعية الدموية من أكثر أسباب الوفيات شيوعًا، لكن الدراسات تؤكد أن نمط الحياة يغيّر المعادلة.\n\n1. تحرّك 30 دقيقة يوميًا — حتى المشي السريع يُحدث فرقًا.\n2. قلّل الملح والسكر المضاف.\n3. راقب ضغطك وكولسترولك دوريًا.\n4. توقف عن التدخين.\n5. نم 7–8 ساعات.\n6. أدر التوتر.\n7. افحص سكّر الدم سنويًا.\n\nاحجز فحصك الدوري مع أطباء نبضة بلس اليوم.',
    category: 'صحة عامة',
    tags: ['قلب', 'وقاية', 'فحص دوري'],
    author_name: 'الفريق الطبي — نبضة بلس',
    author_title: 'محتوى طبي مراجع',
  },
  {
    slug: 'tagdhyat-tflk',
    title_ar: 'تغذية طفلك في المدرسة: دليل عملي للأمهات',
    title_en: 'School nutrition: a practical guide for mothers',
    excerpt_ar: 'الوجبة المدرسية المتوازنة ترفع التركيز والتحصيل — إليك كيف تجهزينها بذكاء.',
    body_ar: 'ما يأكله طفلك في المدرسة يؤثر مباشرة في تركيزه وطاقته.\n\nالقاعدة الذهبية: بروتين + كربوهيدرات معقدة + فاكهة + ماء.\n\nأمثلة عملية:\n- ساندويتش جبن/بيض + خيار + تفاحة + ماء\n- تمر + حليب + مكسرات (لمن لا يعاني حساسية)\n\nتجنّبي: العصائر المحلاة، الشيبس، والشوكولاتة كبديل يومي.\n\nاستشيري أخصائيي التغذية عبر نبضة بلس لخطة تناسب طفلك.',
    category: 'أمومة وطفولة',
    tags: ['تغذية', 'أطفال', 'مدرسة'],
    author_name: 'الفريق الطبي — نبضة بلس',
    author_title: 'محتوى طبي مراجع',
  },
  {
    slug: 'skr-aldm',
    title_ar: 'السكري النوع الثاني: الفحص المبكر ينقذ حياتك',
    title_en: 'Type 2 diabetes: early screening saves lives',
    excerpt_ar: 'واحد من كل خمسة بالغين في المملكة مصاب بالسكري — نصفهم لا يعرف.',
    body_ar: 'السكري النوع الثاني يتطور بصمت لسنوات.\n\nعلامات تحذيرية: عطش متكرر، تبول متكرر، تعب، تشوش رؤية، بطء التئام الجروح.\n\nمتى تفحص؟\n- فوق 35 سنة: سنويًا\n- وزن زائد أو تاريخ عائلي: من سن أصغر\n\nالفحص: سكر صائم (HbA1c أدق) — متوفر منزليًا عبر تحاليل نبضة بلس مع متابعة رقمية للنتائج.',
    category: 'أمراض مزمنة',
    tags: ['سكري', 'تحاليل', 'فحص'],
    author_name: 'الفريق الطبي — نبضة بلس',
    author_title: 'محتوى طبي مراجع',
  },
];

async function main() {
  await mongoose.connect(MONGO_URI);
  const col = mongoose.connection.collection('articles');
  for (const a of ARTICLES) {
    await col.updateOne(
      { slug: a.slug },
      { $set: { ...a, status: 'PUBLISHED', published_at: new Date(), is_deleted: false }, $setOnInsert: { id: new mongoose.Types.UUID().toString(), views: 0, createdAt: new Date() } },
      { upsert: true },
    );
  }
  console.log(`Seeded ${ARTICLES.length} articles`);
  await mongoose.disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
