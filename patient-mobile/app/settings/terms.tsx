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
  icon: string;
  body: string;
}

const SECTIONS: TermsSection[] = [
  {
    title: "مقدمة",
    icon: "document",
    body: "مرحباً بكم في تطبيق نبض بلس. باستخدامك لهذا التطبيق فإنك توافق على الالتزام بهذه الشروط والأحكام. يُرجى قراءتها بعناية قبل استخدام أي من خدماتنا. يُعد استمرارك في استخدام التطبيق بمثابة موافقة صريحة وغير مشروطة على جميع البنود الواردة أدناه. في حال عدم موافقتك على أي من هذه الشروط، يُرجى التوقف عن استخدام التطبيق فوراً.",
  },
  {
    title: "شروط استخدام التطبيق",
    icon: "shield",
    body: "يجب أن يكون عمر المستخدم 18 عاماً على الأقل لإنشاء حساب. يلتزم المستخدم بتقديم معلومات صحيحة ودقيقة عند التسجيل وعدم مشاركة بيانات الدخول مع أي طرف آخر. يُحظر استخدام التطبيق لأي أغراض غير مشروعة أو مخالفة للأنظمة المعمول بها في المملكة العربية السعودية. تحتفظ نبض بلس بالحق في تعليق أو إلغاء أي حساب يُخالف هذه الشروط دون إشعار مسبق.",
  },
  {
    title: "سياسة الخصوصية",
    icon: "lock",
    body: "نلتزم بحماية خصوصية بياناتك الشخصية والصحية وفقاً لنظام حماية البيانات الشخصية في المملكة العربية السعودية. يتم تشفير جميع البيانات باستخدام بروتوكولات أمان متقدمة (AES-256) ومعايير ISO 27001. لا نشارك بياناتك مع أي أطراف خارجية إلا بموافقتك الصريحة أو بموجب أمر قضائي. يحق لك طلب الاطلاع على بياناتك أو تعديلها أو حذفها في أي وقت من خلال إعدادات الحساب.",
  },
  {
    title: "حقوق الملكية الفكرية",
    icon: "star",
    body: "جميع المحتويات المعروضة في التطبيق بما في ذلك النصوص والصور والشعارات والتصاميم والبرمجيات هي ملكية حصرية لشركة نبض بلس أو مرخصيها. يُحظر نسخ أو إعادة إنتاج أو توزيع أو تعديل أي جزء من محتوى التطبيق دون الحصول على إذن خطي مسبق. العلامات التجارية المسجلة المستخدمة في التطبيق محمية بموجب قوانين الملكية الفكرية المعمول بها.",
  },
  {
    title: "المسؤولية الطبية",
    icon: "monitor_heart",
    body: "الاستشارات الطبية المقدمة عبر التطبيق هي لأغراض استشارية عامة ولا تُغني عن زيارة الطبيب المباشرة عند الحاجة. لا يتحمل التطبيق أي مسؤولية عن القرارات الطبية المتخذة بناءً على المعلومات المقدمة. في حالات الطوارئ الطبية، يُرجى الاتصال بخدمات الطوارئ فوراً (997) أو التوجه لأقرب مستشفى. جميع الأطباء المسجلين في التطبيق مرخصون من الهيئة السعودية للتخصصات الصحية.",
  },
  {
    title: "الإلغاء والاسترجاع",
    icon: "cash",
    body: "يمكن إلغاء المواعيد المحجوزة قبل 24 ساعة من الموعد المحدد مع استرداد كامل المبلغ إلى المحفظة خلال 3-5 أيام عمل. في حالة الإلغاء خلال أقل من 24 ساعة، يتم خصم 25% من قيمة الحجز كرسوم إلغاء. طلبات الصيدلية المؤكدة والتي بدأت مرحلة التجهيز لا يمكن إلغاؤها. يمكن إرجاع المنتجات غير المستخدمة خلال 7 أيام من تاريخ الاستلام بشرط سلامة العبوة الأصلية.",
  },
  {
    title: "التعديلات",
    icon: "edit",
    body: "تحتفظ نبض بلس بالحق في تعديل هذه الشروط والأحكام في أي وقت. سيتم إشعار المستخدمين بأي تغييرات جوهرية عبر إشعارات التطبيق أو البريد الإلكتروني المسجل. يُعد استمرار المستخدم في استخدام التطبيق بعد نشر التعديلات بمثابة قبول ضمني لتلك التعديلات. ننصح بمراجعة هذه الصفحة بشكل دوري للاطلاع على آخر المستجدات.",
  },
  {
    title: "التواصل",
    icon: "mail",
    body: "لأي استفسارات أو ملاحظات حول هذه الشروط والأحكام، يمكنكم التواصل معنا عبر البريد الإلكتروني: legal@nabdahplus.com أو من خلال خدمة الدعم الفني المتوفرة على مدار الساعة في التطبيق. يمكنكم أيضاً إرسال مراسلات خطية إلى مقرنا الرئيسي في الرياض، المملكة العربية السعودية. نلتزم بالرد على جميع الاستفسارات خلال 48 ساعة عمل كحد أقصى.",
  },
];

export default function TermsScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();

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
        <AppText variant="h4">الشروط والأحكام</AppText>
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
              آخر تحديث: 1 يونيو 2026
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
                  {section.title}
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
                {section.body}
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
