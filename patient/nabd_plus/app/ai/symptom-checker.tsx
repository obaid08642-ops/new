// @ts-nocheck
// app/ai/symptom-checker.tsx
// فاحص الأعراض الذكي مع خريطة الجسم التفاعلية
import React, { useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  TextInput,
  Alert,
} from "react-native";
import { router } from "expo-router";
import BodyMap3D from "../../src/components/BodyMap3D";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "../../src/context/AppContext";
import { useSelector } from "react-redux";
import { Icon } from "../../src/components/Icon";
import {
  AppText,
  Card,
  Badge,
  Button,
  IconButton,
} from "../../src/components/ui";
import { apiFetch } from "../../src/utils/api";
import { showLocalizedAlert } from '../../src/components/LocalizedAlert';

const { width } = Dimensions.get("window");

// Body regions with their positions on the body map
const BODY_REGIONS = {
  front: [
    {
      id: "head",
      label: "الرأس",
      x: 47,
      y: 4,
      symptoms: ["صداع", "دوار", "ألم في الرأس"],
    },
    {
      id: "throat",
      label: "الحلق",
      x: 47,
      y: 12,
      symptoms: ["التهاب حلق", "بلع صعب"],
    },
    {
      id: "chest",
      label: "الصدر",
      x: 47,
      y: 22,
      symptoms: ["ألم صدر", "ضيق تنفس", "سعال"],
    },
    {
      id: "abdomen",
      label: "البطن",
      x: 47,
      y: 35,
      symptoms: ["ألم بطن", "غثيان", "إسهال"],
    },
    {
      id: "leftArm",
      label: "الذراع الأيسر",
      x: 22,
      y: 28,
      symptoms: ["ألم ذراع", "تنميل"],
    },
    {
      id: "rightArm",
      label: "الذراع الأيمن",
      x: 72,
      y: 28,
      symptoms: ["ألم ذراع", "تنميل"],
    },
    {
      id: "pelvis",
      label: "الحوض",
      x: 47,
      y: 46,
      symptoms: ["ألم أسفل البطن", "ألم في الظهر"],
    },
    {
      id: "leftLeg",
      label: "الساق اليسرى",
      x: 35,
      y: 62,
      symptoms: ["ألم ساق", "تورم", "تشنج"],
    },
    {
      id: "rightLeg",
      label: "الساق اليمنى",
      x: 58,
      y: 62,
      symptoms: ["ألم ساق", "تورم", "تشنج"],
    },
  ],
};

const SYMPTOMS_LIBRARY = [
  { id: "headache", label: "صداع", icon: "bandaid", severity: "mild" },
  { id: "fever", label: "حمى", icon: "thermometer", severity: "moderate" },
  { id: "cough", label: "سعال", icon: "shield", severity: "mild" },
  {
    id: "chest_pain",
    label: "ألم صدر",
    icon: "monitor_heart",
    severity: "severe",
  },
  { id: "nausea", label: "غثيان", icon: "warning", severity: "mild" },
  { id: "dizziness", label: "دوار", icon: "warning", severity: "moderate" },
  { id: "fatigue", label: "إعياء", icon: "sleep", severity: "mild" },
  { id: "shortBreath", label: "ضيق تنفس", icon: "warning", severity: "severe" },
  { id: "backPain", label: "ألم ظهر", icon: "bandaid", severity: "moderate" },
  { id: "soreThroat", label: "التهاب حلق", icon: "warning", severity: "mild" },
  {
    id: "stomachPain",
    label: "ألم معدة",
    icon: "warning",
    severity: "moderate",
  },
  { id: "rash", label: "طفح جلدي", icon: "error", severity: "moderate" },
];

const DURATION_OPTIONS = [
  "أقل من يوم",
  "1-3 أيام",
  "3-7 أيام",
  "أكثر من أسبوع",
];
const SEVERITY_OPTIONS = ["خفيف", "متوسط", "شديد", "شديد جداً"];

export default function SymptomCheckerScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();

  const [step, setStep] = useState<
    "map" | "symptoms" | "details" | "analyzing" | "result"
  >("map");
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);

  // 3D body map → region symptoms auto-selected, then to the symptoms step
  const handleRegionSelect = (regionId: string) => {
    const region = BODY_REGIONS.front.find((r) => r.id === regionId);
    if (!region) return;
    setSelectedRegion(regionId);
    const regionSymptoms = region.symptoms
      .map((s) => SYMPTOMS_LIBRARY.find((sym) => sym.label === s)?.id)
      .filter(Boolean) as string[];
    setSelectedSymptoms((prev) => [...new Set([...prev, ...regionSymptoms])]);
    setStep("symptoms");
  };
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [duration, setDuration] = useState("");
  const [severity, setSeverity] = useState("");
  const [bodyView, setBodyView] = useState<"front" | "back">("front");
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  const [extraAnswers, setExtraAnswers] = useState<Record<number, boolean | null>>({ 0: null, 1: null, 2: null });
  const user = useSelector((state: any) => state.auth.user);
  const userAge = user?.dateOfBirth ? Math.max(1, Math.floor((Date.now() - new Date(user.dateOfBirth).getTime()) / 31557600000)) : undefined;
  const userGender = user?.gender === 'female' ? 'female' : 'male';

  const toggleSymptom = (id: string) => {
    setSelectedSymptoms((p) =>
      p.includes(id) ? p.filter((x) => x !== id) : [...p, id],
    );
  };

  const handleAnalyze = async () => {
    setStep("analyzing");
    try {
      const symptomLabels = selectedSymptoms.map((id) => {
        const item = SYMPTOMS_LIBRARY.find((x) => x.id === id);
        return item ? item.label : id;
      });
      const extraNotes = [
        extraAnswers[0] != null ? `حساسية أدوية: ${extraAnswers[0] ? 'نعم' : 'لا'}` : null,
        extraAnswers[1] != null ? `أمراض مزمنة: ${extraAnswers[1] ? 'نعم' : 'لا'}` : null,
        extraAnswers[2] != null ? `يتناول أدوية حالياً: ${extraAnswers[2] ? 'نعم' : 'لا'}` : null,
      ].filter(Boolean).join('. ');
      const symptomsText = `الأعراض: ${symptomLabels.join("، ")}. الشدة: ${severity || "غير محددة"}. المدة: ${duration || "غير محددة"}.${extraNotes ? ' ' + extraNotes : ''}`;

      // E2: send demographics only when the profile really has them (no fabricated age 30)
      const triageBody: any = { symptoms: symptomsText, lang: "ar" };
      if (userAge != null) triageBody.age = userAge;
      if (userGender) triageBody.gender = userGender;
      const res = await apiFetch<any>("/ai/triage", {
        method: "POST",
        body: JSON.stringify(triageBody),
      });

      if (res) {
        const u = res.urgency || "routine";
        const formatted = {
          triageSummary: res.reasoning || 'هذه النتيجة توجهك إلى مستوى الرعاية المناسب بناءً على المعلومات المدخلة، ولا تشخّص سبب الأعراض.',
          recommendedSpecialty: {
            name: Array.isArray(res.specialty_suggestions)
              ? res.specialty_suggestions[0]
              : res.specialty_suggestions || 'طب عام',
            icon: 'consultations',
            urgency:
              u === 'emergency'
                ? 'تقييم طارئ الآن'
                : u === 'urgent'
                  ? 'تقييم طبي قريب'
                  : 'متابعة روتينية عند الحاجة',
          },
          urgencyLevel: u,
          nextSteps:
            u === 'emergency'
              ? [
                  'اطلب خدمات الطوارئ المحلية أو توجّه إلى أقرب قسم طوارئ الآن.',
                  'إذا أمكن، لا تبقَ بمفردك أثناء ترتيب المساعدة.',
                ]
              : u === 'urgent'
                ? [
                    'رتّب تقييماً طبياً قريباً عبر الخدمة أو مقدم الرعاية المعتاد.',
                    'اطلب مساعدة عاجلة إذا ساءت الأعراض أو ظهرت علامة إنذار جديدة.',
                  ]
                : [
                    'راقب تغير الأعراض وسجّل ما يهمك لمشاركته مع مقدم الرعاية.',
                    'اطلب تقييماً طبياً إذا استمرت الأعراض أو ساءت أو أقلقتك.',
                  ],
        };
        setAnalysisResult(formatted);
        setStep("result");
      } else {
        throw new Error("No response");
      }
    } catch (err) {
      console.log("Error analyzing symptoms:", err);
      showLocalizedAlert(
        "خطأ",
        "فشل الاتصال بخدمة فحص الأعراض. يرجى المحاولة لاحقاً.",
      );
      setStep("details");
    }
  };

  if (step === "analyzing") {
    return (
      <View style={[styles.container, { backgroundColor: colors.background } ]}>
        <View
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.analyzingContent}>
          <View style={styles.analyzingCircle}>
            <Icon name="robot" size={20} color={colors.primary} />
          </View>
          <AppText variant="bodySM">جاري تحليل أعراضك...</AppText>
          <AppText variant="bodySM">
            نرتّب المعلومات التي أدخلتها لتوجيهك إلى مستوى الرعاية المناسب
          </AppText>
          <View style={styles.analyzingDots}>
            {[0, 1, 2].map((i) => (
              <View
                key={i}
                style={[styles.analyzingDot, { opacity: i === 1 ? 1 : 0.4 }]} />
            ))}
          </View>
          <AppText variant="bodySM">
            لا تُستخدم النتيجة لتشخيص الحالة أو لاستبدال التقييم الطبي
          </AppText>
        </View>
      </View>
    );
  }

  if (step === "result") {
    return (
      <View style={[styles.container, { backgroundColor: colors.background } ]}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
        <View
          style={[
            styles.header,
            {
              paddingTop: insets.top + 8,
              backgroundColor: isDark ? colors.surface : colors.white,
            },]} >
          <TouchableOpacity onPress={() => setStep("map")}>
            <AppText variant="bodySM">فحص جديد</AppText>
          </TouchableOpacity>
          <AppText variant="bodySM">نتائج التحليل</AppText>
          <TouchableOpacity onPress={() => router.back()}>
            <Icon name="back" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={[
            styles.resultContent,
            { paddingBottom: insets.bottom + 100 }, ]} showsVerticalScrollIndicator={false}>
          {/* Disclaimer */}
          <View
            style={[
              styles.disclaimerCard,
              { backgroundColor: isDark ? colors.surfaceSecondary : "#FEF3C7" },]} >
            <AppText variant="bodySM">
               هذا التحليل للاسترشاد فقط ولا يغني عن استشارة طبيب متخصص
            </AppText>
          </View>

          {/* Urgency Banner */}
          <View
            style={styles.urgencyBanner}
          >
            <Icon name="flash" size={20} color={colors.primary} />
            <View style={styles.urgencyInfo}>
              <AppText variant="bodySM">يُنصح بمراجعة طبيب</AppText>
              <AppText variant="bodySM">
                {analysisResult?.recommendedSpecialty?.urgency || "غير محدد"}
              </AppText>
            </View>
            <TouchableOpacity
              onPress={() => router.push("/(tabs)/consultations")}
              style={styles.bookNowBtn}
            >
              <AppText variant="bodySM">احجز الآن</AppText>
            </TouchableOpacity>
          </View>

          <View
            style={[
              styles.card,
              { backgroundColor: isDark ? colors.surface : colors.white },]} >
            <AppText variant="bodySM">توجيه الرعاية</AppText>
            <AppText variant="bodySM" color={colors.textSecondary} style={{ marginTop: 8, lineHeight: 21 }}>
              {analysisResult?.triageSummary}
            </AppText>
            <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 12 }} />
            <AppText variant="bodySM" color={colors.textSecondary}>
              التخصص المقترح: {analysisResult?.recommendedSpecialty?.name || 'طب عام'}
            </AppText>
          </View>

          {/* Symptoms Summary */}
          <View
            style={[
              styles.card,
              { backgroundColor: isDark ? colors.surface : colors.white },]} >
            <AppText variant="bodySM">أعراضك المُدخلة</AppText>
            <View style={styles.symptomsTagsRow}>
              {selectedSymptoms.map((s) => {
                const sym = SYMPTOMS_LIBRARY.find((x) => x.id === s);
                return sym ? (
                  <View
                    key={s}
                    style={[
                      styles.symptomTag,
                      { backgroundColor: colors.primarySurface },]} >
                    <AppText variant="bodySM">{sym.icon}</AppText>
                    <AppText variant="bodySM">{sym.label}</AppText>
                  </View>
                ) : null;
              })}
            </View>
          </View>

          <View
            style={[
              styles.card,
              { backgroundColor: isDark ? colors.surface : colors.white },]} >
            <AppText variant="bodySM">الخطوة التالية الآمنة</AppText>
            {analysisResult?.nextSteps?.map((tip: string, i: number) => (
              <View key={i} style={styles.tipRow}>
                <AppText variant="bodySM">{tip}</AppText>
                <Icon name="check" size={20} color={colors.primary} />
              </View>
            ))}
          </View>

          {/* Action Buttons */}
          <TouchableOpacity
            onPress={() => router.push("/(tabs)/consultations")}
            style={styles.consultNow}
          >
            <View
              style={styles.consultNowInner}
            >
              <View
                style={{
                  flexDirection: "row-reverse",
                  alignItems: "center",
                  gap: 6, }}>
                <Icon name="consultations" size={16} color={colors.primary} />
                <AppText variant="bodySM">استشر طبيباً الآن</AppText>
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push("/ai/symptom-timeline")}
            style={[
              styles.timelineBtn,
              { backgroundColor: isDark ? colors.surface : colors.white },]} >
            <View
              style={{
                flexDirection: "row-reverse",
                alignItems: "center",
                gap: 6, }}>
              <Icon name="trending_up" size={16} color={colors.primary} />
              <AppText variant="bodySM">تتبع تطور الأعراض</AppText>
            </View>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background } ]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <View
        style={[styles.heroHeader, { paddingTop: insets.top + 8 } ]}>
        <View style={styles.heroHeaderRow}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
          >
            <Icon name="back" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={styles.heroTitles}>
            <AppText variant="bodySM">فاحص الأعراض</AppText>
            <AppText variant="bodySM">يعمل بالذكاء الاصطناعي</AppText>
          </View>
          <View style={styles.stepIndicator}>
            {["map", "symptoms", "details"].map((s, i) => (
              <View
                key={i}
                style={[
                  styles.stepDot,
                  ["map", "symptoms", "details"].indexOf(step) >= i &&
                    styles.stepDotActive,
                ]} />
            ))}
          </View>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}>
        {step === "map" && (
          <View style={styles.mapSection}>
            <AppText variant="bodySM">
              اضغط على المنطقة المؤلمة في الجسم 
            </AppText>

            {/* Body View Toggle */}
            <View
              style={[
                styles.viewToggle,
                { backgroundColor: isDark ? colors.surface : colors.white },]} >
              {(["front", "back"] as const).map((v) => (
                <TouchableOpacity
                  key={v}
                  onPress={() => setBodyView(v)}
                  style={[
                    styles.viewToggleBtn,
                    bodyView === v && { backgroundColor: colors.accent },]} >
                  <AppText variant="bodySM">
                    {v ==="front"?"الأمام":"الخلف"}
                  </AppText>
                </TouchableOpacity>
              ))}
            </View>

            {/* Interactive 3D Body Map — drag to rotate 360°, tap a part */}
            <View style={styles.bodyMapContainer}>
              <View
                style={{
                  height: 420,
                  alignItems: "center",
                  justifyContent: "center",
                  marginVertical: 20, }}>
                <BodyMap3D
                  selected={selectedRegion}
                  onSelect={handleRegionSelect}
                  fill={isDark ? "#2A3441" : "#E2E8F0"}
                  fillSelected={colors.primary}
                  stroke={isDark ? "#3F4D63" : "#CBD5E1"}
                  strokeSelected={colors.accent}
                  height={420}
                  view={bodyView}
                />
                <AppText variant="bodySM" color={colors.t3} style={{ marginTop: 4 }}>
                  اسحب لتدوير الجسم ٣٦٠° واضغط على المنطقة
                </AppText>

                {/* Overlay Text for Selected */}
                {selectedRegion && (
                  <View
                    style={{
                      position: "absolute",
                      bottom: -20,
                      backgroundColor: colors.accent,
                      paddingHorizontal: 16,
                      paddingVertical: 8,
                      borderRadius: 20, }}>
                    <AppText variant="bodySM" color="#fff">
                      {
                        BODY_REGIONS.front.find((r) => r.id === selectedRegion)
                          ?.label
                      }
                    </AppText>
                  </View>
                )}
              </View>
            </View>

            <AppText variant="bodySM">— أو اختر أعراضك مباشرة —</AppText>
            <TouchableOpacity
              onPress={() => setStep("symptoms")}
              style={[
                styles.skipToSymptomsBtn,
                { backgroundColor: colors.primarySurface },]} >
              <AppText variant="bodySM">اختيار الأعراض يدوياً ←</AppText>
            </TouchableOpacity>
          </View>
        )}

        {step === "symptoms" && (
          <View style={styles.symptomsSection}>
            <AppText variant="bodySM">
              اختر أعراضك ({selectedSymptoms.length} محدد)
            </AppText>
            {selectedRegion && (
              <View
                style={[
                  styles.selectedRegionBadge,
                  { backgroundColor: colors.primarySurface },]} >
                <AppText variant="bodySM">
                   منطقة:{" "}
                  {
                    BODY_REGIONS.front.find((r) => r.id === selectedRegion)
                      ?.label
                  }
                </AppText>
              </View>
            )}
            <View style={styles.symptomsGrid}>
              {SYMPTOMS_LIBRARY.map((sym) => (
                <TouchableOpacity
                  key={sym.id}
                  onPress={() => toggleSymptom(sym.id)}
                  style={[
                    styles.symptomChip,
                    { backgroundColor: isDark ? colors.surface : colors.white },
                    selectedSymptoms.includes(sym.id) && {
                      backgroundColor: colors.accent,
                      borderColor: colors.accent,
                    },]} >
                  <AppText variant="bodySM">{sym.icon}</AppText>
                  <AppText variant="bodySM">{sym.label}</AppText>
                  {sym.severity === "severe" && (
                    <View style={styles.severeDot} />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              onPress={() => setStep("details")}
              disabled={selectedSymptoms.length === 0}
              style={[
                styles.nextBtn,
                { opacity: selectedSymptoms.length === 0 ? 0.5 : 1 },]} >
              <View
                style={styles.nextBtnInner}
              >
                <AppText variant="bodySM">التالي — تفاصيل الأعراض ←</AppText>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {step === "details" && (
          <View style={styles.detailsSection}>
            <AppText variant="bodySM">تفاصيل إضافية </AppText>

            <View
              style={[
                styles.detailCard,
                { backgroundColor: isDark ? colors.surface : colors.white },]} >
              <AppText variant="bodySM">منذ متى وأنت تعاني؟</AppText>
              <View style={styles.optionsRow}>
                {DURATION_OPTIONS.map((d) => (
                  <TouchableOpacity
                    key={d}
                    onPress={() => setDuration(d)}
                    style={[
                      styles.optChip,
                      duration === d && {
                        backgroundColor: colors.accent,
                        borderColor: "#6366F1",
                      },]} >
                    <AppText variant="bodySM">{d}</AppText>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View
              style={[
                styles.detailCard,
                { backgroundColor: isDark ? colors.surface : colors.white },]} >
              <AppText variant="bodySM">شدة الألم / الأعراض</AppText>
              <View style={styles.optionsRow}>
                {SEVERITY_OPTIONS.map((s, i) => (
                  <TouchableOpacity
                    key={s}
                    onPress={() => setSeverity(s)}
                    style={[
                      styles.optChip,
                      severity === s && {
                        backgroundColor: [
                          "#5BA84F",
                          "#F0A526",
                          "#F0695C",
                          "#7C3AED",
                        ][i],
                        borderColor: "transparent",
                      },
                    ]}>
                    <AppText variant="bodySM">{s}</AppText>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View
              style={[
                styles.detailCard,
                { backgroundColor: isDark ? colors.surface : colors.white },]} >
              <AppText variant="bodySM">أسئلة إضافية</AppText>
              {[
                "هل لديك حساسية لأدوية معينة؟",
                "هل تعاني من أمراض مزمنة؟",
                "هل تتناول أدوية حالياً؟",
              ].map((q, i) => (
                <View
                  key={i}
                  style={[
                    styles.yesNoRow,
                    { borderBottomColor: colors.border },]} >
                  <View style={styles.yesNoButtons}>
                    <TouchableOpacity
                      onPress={() => setExtraAnswers((p) => ({ ...p, [i]: true }))}
                      style={[
                        styles.yesNoBtn,
                        {
                          backgroundColor: extraAnswers[i] === true
                            ? "#5BA84F"
                            : isDark
                              ? "rgba(91,168,79,0.15)"
                              : "#DCFCE7",
                        },]} >
                      <AppText variant="bodySM" color={extraAnswers[i] === true ? '#fff' : undefined}>نعم</AppText>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setExtraAnswers((p) => ({ ...p, [i]: false }))}
                      style={[
                        styles.yesNoBtn,
                        {
                          backgroundColor: extraAnswers[i] === false
                            ? "#F0695C"
                            : isDark
                              ? "rgba(240,105,92,0.15)"
                              : "#FEE2E2",
                        },]} >
                      <AppText variant="bodySM" color={extraAnswers[i] === false ? '#fff' : undefined}>لا</AppText>
                    </TouchableOpacity>
                  </View>
                  <AppText variant="bodySM">{q}</AppText>
                </View>
              ))}
            </View>

            <TouchableOpacity onPress={handleAnalyze} activeOpacity={0.85}>
              <View
                style={styles.analyzeBtn}
              >
                <View
                  style={{
                    flexDirection: "row-reverse",
                    alignItems: "center",
                    gap: 6, }}>
                  <Icon name="robot" size={16} color={colors.primary} />
                  <AppText variant="bodySM">حلّل الأعراض الآن</AppText>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  heroHeader: { paddingHorizontal: 20, paddingBottom: 20 },
  heroHeaderRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  heroTitles: { alignItems: "center" },
  heroTitle: { color: "#fff", fontSize: 18, fontWeight: "800" },
  heroSub: { color: "rgba(255,255,255,0.75)", fontSize: 11, fontWeight: "400" },
  stepIndicator: { flexDirection: "row", gap: 6 },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.3)",
  },
  stepDotActive: { backgroundColor: undefined },

  // Analyzing
  analyzingContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
    padding: 32,
  },
  analyzingCircle: {
    width: 120,
    height: 120,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.3)",
  },
  analyzingTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
  },
  analyzingSubtitle: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
    fontWeight: "400",
    textAlign: "center",
  },
  analyzingDots: { flexDirection: "row", gap: 8 },
  analyzingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: undefined,
  },
  analyzingNote: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
    fontWeight: "400",
    textAlign: "center",
  },

  // Result
  header: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  headerTitle: { fontSize: 17, fontWeight: "800" },
  newCheckBtn: { fontSize: 13, fontWeight: "700" },
  resultContent: { padding: 16, gap: 12 },
  disclaimerCard: { borderRadius: 14, padding: 12 },
  disclaimerText: {
    color: "#92400E",
    fontSize: 12,
    fontWeight: "400",
    textAlign: "right",
    lineHeight: 18,
  },
  urgencyBanner: {
    borderRadius: 20,
    padding: 16,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 12,
  },
  urgencyEmoji: { fontSize: 28 },
  urgencyInfo: { flex: 1, alignItems: "flex-end", gap: 2 },
  urgencyTitle: { color: "#fff", fontSize: 15, fontWeight: "800" },
  urgencyTime: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 12,
    fontWeight: "400",
  },
  bookNowBtn: {
    backgroundColor: "transparent",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  bookNowText: { color: "#D97706", fontSize: 13, fontWeight: "800" },
  card: {
    borderRadius: 20,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "800",
    textAlign: "right",
    marginBottom: 12,
  },
  conditionRow: {
    flexDirection: "row-reverse",
    gap: 12,
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  condRight: {
    flex: 1,
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    gap: 10,
  },
  condLeft: { alignItems: "center", gap: 4, width: 60 },
  condEmoji: { fontSize: 24 },
  condName: { fontSize: 13, fontWeight: "800", textAlign: "right" },
  condDesc: {
    fontSize: 11,
    fontWeight: "400",
    textAlign: "right",
    lineHeight: 16,
  },
  probBar: { width: 50, height: 6, borderRadius: 3, overflow: "hidden" },
  probFill: { height: "100%", borderRadius: 3 },
  probText: { fontSize: 12, fontWeight: "800" },
  symptomsTagsRow: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 8 },
  symptomTag: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 5,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  symptomTagIcon: { fontSize: 14 },
  symptomTagText: { fontSize: 12, fontWeight: "700" },
  tipRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 7,
  },
  tipText: { flex: 1, fontSize: 13, fontWeight: "400", textAlign: "right" },
  consultNow: { borderRadius: 18, overflow: "hidden" },
  consultNowInner: {
    height: 56,
    justifyContent: "center",
    alignItems: "center",
  },
  consultNowText: { color: "#fff", fontSize: 17, fontWeight: "800" },
  timelineBtn: {
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  timelineBtnText: { fontSize: 15, fontWeight: "700" },

  // Map
  mapSection: { padding: 20 },
  mapInstruction: {
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 16,
  },
  viewToggle: {
    flexDirection: "row-reverse",
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
  },
  viewToggleBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  viewToggleText: { fontSize: 13, fontWeight: "700" },
  bodyMapContainer: {
    height: 400,
    position: "relative",
    alignItems: "center",
    marginBottom: 20,
  },
  bodySilhouette: {
    alignItems: "center",
    height: "100%",
    justifyContent: "flex-start",
    paddingTop: 10,
  },
  bodyHead: {
    width: 60,
    height: 70,
    borderRadius: 30,
    backgroundColor: "rgba(99,102,241,0.15)",
    borderWidth: 2,
    borderColor: "rgba(99,102,241,0.4)",
    marginBottom: 4,
  },
  bodyNeck: {
    width: 20,
    height: 20,
    backgroundColor: "rgba(99,102,241,0.12)",
    borderWidth: 1,
    borderColor: "rgba(99,102,241,0.3)",
    marginBottom: 0,
  },
  bodyTorso: {
    width: 100,
    height: 120,
    backgroundColor: "rgba(99,102,241,0.12)",
    borderWidth: 2,
    borderColor: "rgba(99,102,241,0.35)",
    borderRadius: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: -15,
    marginBottom: 0,
  },
  bodyArmLeft: {
    width: 26,
    height: 100,
    backgroundColor: "rgba(99,102,241,0.12)",
    borderWidth: 1.5,
    borderColor: "rgba(99,102,241,0.3)",
    borderRadius: 13,
    position: "absolute",
    left: -30,
    top: 10,
  },
  bodyArmRight: {
    width: 26,
    height: 100,
    backgroundColor: "rgba(99,102,241,0.12)",
    borderWidth: 1.5,
    borderColor: "rgba(99,102,241,0.3)",
    borderRadius: 13,
    position: "absolute",
    right: -30,
    top: 10,
  },
  bodyPelvis: {
    width: 85,
    height: 35,
    backgroundColor: "rgba(99,102,241,0.1)",
    borderWidth: 1.5,
    borderColor: "rgba(99,102,241,0.3)",
    borderRadius: 10,
  },
  bodyLegs: { flexDirection: "row", gap: 10 },
  bodyLeg: {
    width: 36,
    height: 120,
    backgroundColor: "rgba(99,102,241,0.1)",
    borderWidth: 1.5,
    borderColor: "rgba(99,102,241,0.3)",
    borderRadius: 18,
  },
  bodyZone: {
    position: "absolute",
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 8,
    paddingVertical: 5,
    minWidth: 60,
  },
  bodyZoneText: {
    color: "#7A6BEA",
    fontSize: 9,
    fontWeight: "800",
    textAlign: "center",
  },
  orText: {
    textAlign: "center",
    fontSize: 13,
    fontWeight: "400",
    marginVertical: 12,
  },
  skipToSymptomsBtn: { borderRadius: 14, padding: 14, alignItems: "center" },
  skipToSymptomsText: { fontSize: 15, fontWeight: "700" },

  // Symptoms
  symptomsSection: { padding: 16, gap: 12 },
  sectionTitle: { fontSize: 16, fontWeight: "800", textAlign: "right" },
  selectedRegionBadge: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: "flex-end",
  },
  selectedRegionText: { fontSize: 12, fontWeight: "700" },
  symptomsGrid: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 10 },
  symptomChip: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "rgba(0,0,0,0.1)",
    paddingHorizontal: 14,
    paddingVertical: 10,
    position: "relative",
  },
  symptomIcon: { fontSize: 18 },
  symptomLabel: { fontSize: 13, fontWeight: "700" },
  severeDot: {
    position: "absolute",
    top: 4,
    left: 4,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#F0695C",
  },
  nextBtn: { marginTop: 8, borderRadius: 18, overflow: "hidden" },
  nextBtnInner: { height: 54, justifyContent: "center", alignItems: "center" },
  nextBtnText: { color: "#fff", fontSize: 16, fontWeight: "800" },

  // Details
  detailsSection: { padding: 16, gap: 12 },
  detailCard: {
    borderRadius: 18,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    gap: 12,
  },
  detailLabel: { fontSize: 14, fontWeight: "800", textAlign: "right" },
  optionsRow: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 8 },
  optChip: {
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "rgba(0,0,0,0.1)",
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  optText: { fontSize: 12, fontWeight: "700" },
  yesNoRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  questionText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "400",
    textAlign: "right",
  },
  yesNoButtons: { flexDirection: "row", gap: 6 },
  yesNoBtn: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5 },
  analyzeBtn: {
    height: 56,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  analyzeBtnText: { color: "#fff", fontSize: 17, fontWeight: "800" },
});
