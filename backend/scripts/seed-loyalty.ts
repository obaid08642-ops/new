// @ts-nocheck
/**
 * EPIC 4 / S18 seed: default loyalty challenges + rewards catalog so the
 * engagement screens (loyalty/challenges, loyalty/rewards) work end-to-end
 * with real data. Idempotent (upsert by id) — safe to re-run.
 * Run: npx ts-node scripts/seed-loyalty.ts
 */
import mongoose from 'mongoose';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/nabdah';

const now = new Date();
const in90Days = new Date(now.getTime() + 90 * 24 * 3600 * 1000);

// target_action must match loyalty POINTS_TABLE reasons (booking_completed,
// order_delivered, review_submitted, referral_converted, vitals_logged) —
// LoyaltyService.updateChallengeProgress keys on the award reason.
const CHALLENGES = [
  {
    id: 'chal-book-3',
    title_ar: 'تحدي المواعيد الثلاثة',
    title_en: 'Three Appointments Challenge',
    description: 'أكمل 3 مواعيد خلال الموسم واكسب 150 نقطة إضافية.',
    target_action: 'booking_completed',
    target_count: 3,
    reward_points: 150,
  },
  {
    id: 'chal-vitals-7',
    title_ar: 'أسبوع العلامات الحيوية',
    title_en: 'Vitals Week',
    description: 'سجّل علاماتك الحيوية 7 مرات لتبني عادة المتابعة اليومية.',
    target_action: 'vitals_logged',
    target_count: 7,
    reward_points: 100,
  },
  {
    id: 'chal-order-2',
    title_ar: 'انتظام الدواء',
    title_en: 'Medication Routine',
    description: 'اطلب أدويتك من الصيدلية مرتين واكسب 80 نقطة.',
    target_action: 'order_delivered',
    target_count: 2,
    reward_points: 80,
  },
  {
    id: 'chal-review-2',
    title_ar: 'صوتك يهمنا',
    title_en: 'Your Voice Matters',
    description: 'قيّم تجربتين (طبيب أو طلب) وساعدنا نحسّن الخدمة.',
    target_action: 'review_submitted',
    target_count: 2,
    reward_points: 60,
  },
  {
    id: 'chal-refer-1',
    title_ar: 'ادعُ صديقاً',
    title_en: 'Invite a Friend',
    description: 'صديق واحد يسجّل ويكمل أول حجز يكسبك 150 نقطة إضافية.',
    target_action: 'referral_converted',
    target_count: 1,
    reward_points: 150,
  },
];

const REWARDS = [
  {
    id: 'rwd-delivery-free',
    title_ar: 'توصيل مجاني',
    title_en: 'Free Delivery',
    description: 'توصيل مجاني لطلب صيدلية واحد.',
    points_required: 200,
    reward_type: 'coupon',
    value: 15,
  },
  {
    id: 'rwd-lab-30',
    title_ar: 'خصم 30 ر.س على التحاليل',
    title_en: 'SAR 30 Lab Discount',
    description: 'خصم 30 ر.س على حجز تحاليل منزلية.',
    points_required: 300,
    reward_type: 'coupon',
    value: 30,
  },
  {
    id: 'rwd-cashback-20',
    title_ar: 'استرداد 20 ر.س',
    title_en: 'SAR 20 Cashback',
    description: 'استرداد نقدي 20 ر.س يضاف إلى محفظتك.',
    points_required: 400,
    reward_type: 'cashback',
    value: 20,
  },
  {
    id: 'rwd-consult-50',
    title_ar: 'خصم 50 ر.س على استشارة',
    title_en: 'SAR 50 Consultation Discount',
    description: 'خصم 50 ر.س على استشارة فيديو مع طبيب.',
    points_required: 500,
    reward_type: 'coupon',
    value: 50,
  },
  {
    id: 'rwd-badge-gold',
    title_ar: 'شارة نجم الصحة الذهبي',
    title_en: 'Golden Health Star Badge',
    description: 'شارة مميزة تظهر في ملفك الصحي.',
    points_required: 1000,
    reward_type: 'badge',
  },
];

async function main() {
  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db;

  for (const ch of CHALLENGES) {
    await db.collection('loyalty_challenges').updateOne(
      { id: ch.id },
      { $set: { ...ch, start_date: now, end_date: in90Days, active: true }, $setOnInsert: { createdAt: now } },
      { upsert: true },
    );
  }
  for (const rw of REWARDS) {
    await db.collection('loyalty_rewards').updateOne(
      { id: rw.id },
      { $set: { ...rw, stock: 999, active: true }, $setOnInsert: { createdAt: now } },
      { upsert: true },
    );
  }

  const chCount = await db.collection('loyalty_challenges').countDocuments({ active: true });
  const rwCount = await db.collection('loyalty_rewards').countDocuments({ active: true });
  console.log(`✔ loyalty seeded: ${chCount} active challenges, ${rwCount} active rewards`);
  await mongoose.disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
