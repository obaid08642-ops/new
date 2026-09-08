// @ts-nocheck
import React from "react";
import { View, StyleSheet, ScrollView, StatusBar } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useApp } from "../../src/context/AppContext";
import { Icon } from "../../src/components/Icon";
import { AppText, Card, IconButton } from "../../src/components/ui";

interface TermsSection {
  title: string;
  title_en: string;
  icon: string;
  body: string;
  body_en: string;
}

const SECTIONS: TermsSection[] = [
  {
    title: "مقدمة",
    title_en: "Introduction",
    title_en: "Introduction",
    icon: "document",
    body: "مرحباً بكم في تطبيق نبض بلس. باستخدامك لهذا التطبيق فإنك توافق على الالتزام بهذه الشروط والأحكام. يُرجى قراءتها بعناية قبل استخدام أي من خدماتنا. يُعد استمرارك في استخدام التطبيق بمثابة موافقة صريحة وغير مشروطة على جميع البنود الواردة أدناه. في حال عدم موافقتك على أي من هذه الشروط، يُرجى التوقف عن استخدام التطبيق فوراً.",
    body_en: "Welcome to the Nabd Plus app. By using this app you agree to be bound by these Terms and Conditions. Please read them carefully before using any of our services. Your continued use of the app constitutes express and unconditional acceptance of all terms below. If you do not agree with any of these terms, please stop using the app immediately.",
  },
  {
    title: "شروط استخدام التطبيق",
    title_en: "App Terms of Use",
    icon: "shield",
    body: "يجب أن يكون عمر المستخدم 18 عاماً على الأقل لإنشاء حساب. يلتزم المستخدم بتقديم معلومات صحيحة ودقيقة عند التسجيل وعدم مشاركة بيانات الدخول مع أي طرف آخر. يُحظر استخدام التطبيق لأي أغراض غير مشروعة أو مخالفة للأنظمة المعمول بها في المملكة العربية السعودية. تحتفظ نبض بلس بالحق في تعليق أو إلغاء أي حساب يُخالف هذه الشروط دون إشعار مسبق.",
    body_en: "Users must be at least 18 years old to create an account. Users must provide accurate information at registration and must not share login credentials with any third party. Using the app for any unlawful purpose or in violation of the regulations of Saudi Arabia is prohibited. Nabd Plus reserves the right to suspend or terminate any violating account without prior notice.",
  },
  {
    title: "سياسة الخصوصية",
    title_en: "Privacy Policy",
    icon: "lock",
    body: "نلتزم بحماية خصوصية بياناتك الشخصية والصحية وفقاً لنظام حماية البيانات الشخصية في المملكة العربية السعودية. يتم تشفير جميع البيانات باستخدام بروتوكولات أمان متقدمة (AES-256) ومعايير ISO 27001. لا نشارك بياناتك مع أي أطراف خارجية إلا بموافقتك الصريحة أو بموجب أمر قضائي. يحق لك طلب الاطلاع على بياناتك أو تعديلها أو حذفها في أي وقت من خلال إعدادات الحساب.",
    body_en: "We protect the privacy of your personal and health data in accordance with the Personal Data Protection Law of Saudi Arabia. All data is encrypted using advanced security protocols (AES-256) and ISO 27001 standards. We do not share your data with any third party except with your explicit consent or under a court order. You may request to view, amend, or delete your data at any time via account settings.",
  },
  {
    title: "حقوق الملكية الفكرية",
    title_en: "Intellectual Property Rights",
    icon: "star",
    body: "جميع المحتويات المعروضة في التطبيق بما في ذلك النصوص والصور والشعارات والتصاميم والبرمجيات هي ملكية حصرية لشركة نبض بلس أو مرخصيها. يُحظر نسخ أو إعادة إنتاج أو توزيع أو تعديل أي جزء من محتوى التطبيق دون الحصول على إذن خطي مسبق. العلامات التجارية المسجلة المستخدمة في التطبيق محمية بموجب قوانين الملكية الفكرية المعمول بها.",
    body_en: "All content displayed in the app, including texts, images, logos, designs, and software, is the exclusive property of Nabd Plus or its licensors. Copying, reproducing, distributing, or modifying any part of the app content without prior written permission is prohibited. Registered trademarks used in the app are protected under applicable intellectual property laws.",
  },
  {
    title: "المسؤولية الطبية",
    title_en: "Medical Liability",
    icon: "monitor_heart",
    body: "الاستشارات الطبية المقدمة عبر التطبيق هي لأغراض استشارية عامة ولا تُغني عن زيارة الطبيب المباشرة عند الحاجة. لا يتحمل التطبيق أي مسؤولية عن القرارات الطبية المتخذة بناءً على المعلومات المقدمة. في حالات الطوارئ الطبية، يُرجى الاتصال بخدمات الطوارئ فوراً (997) أو التوجه لأقرب مستشفى. جميع الأطباء المسجلين في التطبيق مرخصون من الهيئة السعودية للتخصصات الصحية.",
    body_en: "Medical consultations provided through the app are for general advisory purposes and do not replace an in-person doctor visit when needed. The app bears no liability for medical decisions made based on the information provided. In medical emergencies, please call emergency services immediately (997) or go to the nearest hospital. All doctors registered in the app are licensed by the Saudi Commission for Health Specialties.",
  },
  {
    title: "الإلغاء والاسترجاع",
    title_en: "Cancellation & Refunds",
    icon: "cash",
    body: "يمكن إلغاء المواعيد المحجوزة قبل 24 ساعة من الموعد المحدد مع استرداد كامل المبلغ إلى المحفظة خلال 3-5 أيام عمل. في حالة الإلغاء خلال أقل من 24 ساعة، يتم خصم 25% من قيمة الحجز كرسوم إلغاء. طلبات الصيدلية المؤكدة والتي بدأت مرحلة التجهيز لا يمكن إلغاؤها. يمكن إرجاع المنتجات غير المستخدمة خلال 7 أيام من تاريخ الاستلام بشرط سلامة العبوة الأصلية.",
    body_en: "Booked appointments may be cancelled at least 24 hours before the scheduled time with a full refund to the wallet within 3-5 business days. Cancellations made less than 24 hours in advance incur a 25% cancellation fee. Confirmed pharmacy orders that have entered preparation cannot be cancelled. Unused products may be returned within 7 days of receipt provided the original packaging is intact.",
  },
  {
    title: "التعديلات",
    title_en: "Amendments",
    icon: "edit",
    body: "تحتفظ نبض بلس بالحق في تعديل هذه الشروط والأحكام في أي وقت. سيتم إشعار المستخدمين بأي تغييرات جوهرية عبر إشعارات التطبيق أو البريد الإلكتروني المسجل. يُعد استمرار المستخدم في استخدام التطبيق بعد نشر التعديلات بمثابة قبول ضمني لتلك التعديلات. ننصح بمراجعة هذه الصفحة بشكل دوري للاطلاع على آخر المستجدات.",
    body_en: "Nabd Plus reserves the right to amend these Terms and Conditions at any time. Users will be notified of material changes via in-app notifications or the registered email. Continued use of the app after amendments are published constitutes implied acceptance. We recommend reviewing this page periodically for the latest updates.",
  },
  {
    title: "التواصل",
    title_en: "Contact",
    icon: "mail",
    body: "لأي استفسارات أو ملاحظات حول هذه الشروط والأحكام، يمكنكم التواصل معنا عبر البريد الإلكتروني: legal@nabdahplus.com أو من خلال خدمة الدعم الفني المتوفرة على مدار الساعة في التطبيق. يمكنكم أيضاً إرسال مراسلات خطية إلى مقرنا الرئيسي في الرياض، المملكة العربية السعودية. نلتزم بالرد على جميع الاستفسارات خلال 48 ساعة عمل كحد أقصى.",
    body_en: "For any questions or remarks about these Terms and Conditions, contact us at legal@nabdahplus.com or through the 24/7 in-app technical support. You may also send written correspondence to our head office in Riyadh, Saudi Arabia. We commit to responding to all inquiries within a maximum of 48 business hours.",
  },
];

export default function TermsScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark, lang } = useApp() as any;
  const isEn = lang !== 'ar';
  const t = (ar: string, en: string) => (isEn ? en : ar);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 8,
            backgroundColor: colors.surface,
            borderBottomColor: colors.borderLight,
          },
        ]}
      >
        <View style={{ width: 40 }} />
        <AppText variant="h4">{t('الشروط والأحكام', 'Terms & Conditions')}</AppText>
        <IconButton icon="back" onPress={() => router.back()} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          entering={FadeInDown.delay(100).duration(500)}
          style={[
            styles.versionBanner,
            { backgroundColor: colors.primarySurface },
          ]}
        >
          <View style={styles.versionRow}>
            <Icon name="info" size={18} color={colors.primary} />
            <AppText variant="labelMD" color={colors.primary}>
              {t('آخر تحديث: 1 يونيو 2026', 'Last updated: June 1, 2026')}
            </AppText>
          </View>
        </Animated.View>

        {SECTIONS.map((section, index) => (
          <Animated.View
            key={section.title}
            entering={FadeInDown.delay(150 + index * 80).duration(500)}
          >
            <Card style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Icon
                  name={section.icon as any}
                  size={22}
                  color={colors.primary}
                />
                <AppText variant="h5" color={colors.textPrimary}>
                  {t(section.title, section.title_en)}
                </AppText>
              </View>
              <View
                style={[
                  styles.divider,
                  { backgroundColor: colors.borderLight },
                ]}
              />
              <AppText
                variant="bodySM"
                color={colors.textSecondary}
                style={styles.sectionBody}
              >
                {t(section.body, section.body_en)}
              </AppText>
            </Card>
          </Animated.View>
        ))}

        <Animated.View
          entering={FadeInDown.delay(900).duration(500)}
          style={styles.footer}
        >
          <Icon name="shield" size={20} color={colors.textTertiary} />
          <AppText variant="caption" color={colors.textTertiary} align="center">
            جميع الحقوق محفوظة لشركة نبض بلس 2026
          </AppText>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  scrollContent: {
    padding: 20,
    gap: 14,
    paddingBottom: 100,
  },
  versionBanner: {
    borderRadius: 14,
    padding: 14,
  },
  versionRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
  },
  sectionCard: {
    padding: 18,
  },
  sectionHeader: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  divider: {
    height: 1,
    marginBottom: 12,
  },
  sectionBody: {
    lineHeight: 26,
  },
  footer: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 20,
  },
});
