# جرد النصوص العربية المرشحة لتوطين يدوي إضافي — تطبيق المريض

**النطاق:** ملفات TS/TSX تحت `app/` و`src/`، مع استبعاد مجلد i18n والأصول.
**الغرض:** هذا الفحص لا يحكم بأن كل سطر عطل؛ بل يرصد النص العربي الظاهر في مكوّنات أو خصائص لا يثبت الفحص الساكن أنها تمر عبر `AppText`/`autoTranslate`.
**النتيجة:** **526** سطراً مرشحاً في **139** ملفاً.

> لا تعني تغطية القاموس المولّد وحدها أن كل نص مرئي سيعرض بلغة المستخدم؛ هذه القائمة هي قائمة عمل للفصل بين النصوص الدلالية، وأسماء العلامات، ورسائل الحالة، وخصائص الإدخال، والواجهات التي تحتاج مفاتيح i18n صريحة.

| الملف | السطر | المقتطف |
|---|---:|---|
| app/(auth)/forgot-password.tsx | 112 | label="إرسال رمز التحقق" |
| app/(auth)/forgot-password.tsx | 120 | label="العودة لتسجيل الدخول" |
| app/(auth)/provider-info.tsx | 59 | label="الاستمرار كمريض" |
| app/(auth)/register.tsx | 227 | label={'الاسم الكامل'} |
| app/(auth)/register.tsx | 236 | label={'رقم الهاتف'} |
| app/(auth)/register.tsx | 245 | label={'البريد الإلكتروني'} |
| app/(auth)/register.tsx | 254 | label={'كلمة المرور'} |
| app/(auth)/register.tsx | 264 | label={'تأكيد كلمة المرور'} |
| app/(auth)/reset-password.tsx | 73 | label="تسجيل الدخول" |
| app/(auth)/reset-password.tsx | 132 | label="حفظ كلمة المرور" |
| app/(onboarding)/permissions.tsx | 169 | label="متابعة" |
| app/(tabs)/consultations/index.tsx | 36 | const [activePay, setActivePay] = useState('الكل'); |
| app/(tabs)/consultations/index.tsx | 38 | const [activeSpec, setActiveSpec] = useState('الكل'); |
| app/(tabs)/consultations/index.tsx | 43 | const [filterTitle, setFilterTitle] = useState('الكل'); |
| app/(tabs)/consultations/index.tsx | 44 | const [filterGender, setFilterGender] = useState('الكل'); |
| app/(tabs)/consultations/index.tsx | 45 | const [filterPrice, setFilterPrice] = useState('الكل'); |
| app/(tabs)/consultations/index.tsx | 46 | const [filterAvail, setFilterAvail] = useState('الكل'); |
| app/(tabs)/consultations/index.tsx | 47 | const [filterSort, setFilterSort] = useState('الأعلى تقييماً'); |
| app/(tabs)/consultations/index.tsx | 49 | const [insCompany, setInsCompany] = useState('الكل'); |
| app/(tabs)/consultations/index.tsx | 50 | const [insClass, setInsClass] = useState('الكل'); |
| app/(tabs)/consultations/index.tsx | 54 | 'الكل': ['الكل'], |
| app/(tabs)/consultations/index.tsx | 55 | 'بوبا العربية (Bupa)': ['VIP', 'شبكة 1', 'شبكة 2', 'شبكة 3', 'شبكة 4', 'شبكة 5', 'شبكة 6', 'شبكة 7', 'شبكة 8'], |
| app/(tabs)/consultations/index.tsx | 56 | 'التعاونية (Tawuniya)': ['الماسية', 'البلاتينية', 'الذهبية', 'الفضية', 'البرونزية', 'الأساسية', 'عائلتي'], |
| app/(tabs)/consultations/index.tsx | 57 | 'تكافل الراجحي': ['الفئة 1', 'الفئة 2', 'الفئة 3', 'الفئة 4', 'الفئة 5', 'الفئة 6', 'الفئة 7'], |
| app/(tabs)/consultations/index.tsx | 58 | 'ميدغلف (Medgulf)': ['الفئة A', 'الفئة B', 'الفئة C', 'الفئة D'], |
| app/(tabs)/consultations/index.tsx | 60 | 'جي آي جي (GIG)': ['شبكة 1', 'شبكة 2', 'شبكة 3', 'شبكة 4', 'شبكة 5'], |
| app/(tabs)/consultations/index.tsx | 61 | 'ملاذ للتأمين': ['شبكة مميزة', 'شبكة عامة'], |
| app/(tabs)/consultations/index.tsx | 64 | 'الدرع العربي': ['الماسية', 'الذهبية', 'الفضية'], |
| app/(tabs)/consultations/index.tsx | 70 | 'أليانز السعودي الفرنسي': ['الماسية', 'الذهبية', 'الفضية'], |
| app/(tabs)/consultations/index.tsx | 122 | let isInsured = (d.insurance_supported && d.insurance_supported.length > 0) \|\| (d.tags && d.tags.includes('تأمين')); |
| app/(tabs)/consultations/index.tsx | 143 | let matchesTitle = filterTitle === 'الكل' \|\| (d.sp \|\| d.badge \|\| d.biography \|\| '').includes(filterTitle); |
| app/(tabs)/consultations/index.tsx | 214 | <TouchableOpacity style={[styles.segmentBtn, activePay === 'الكل' && { backgroundColor: resolveColor('var(--n)') }]} onPress={() => setActivePay('الكل')}> |
| app/(tabs)/consultations/index.tsx | 217 | <TouchableOpacity style={[styles.segmentBtn, activePay === 'كاش' && { backgroundColor: resolveColor('var(--n)') }]} onPress={() => setActivePay('كاش')}> |
| app/(tabs)/consultations/index.tsx | 220 | <TouchableOpacity style={[styles.segmentBtn, activePay === 'تأمين' && { backgroundColor: resolveColor('var(--n)') }]} onPress={() => { setActivePay('تأمين'); setStepIns(1); setShowInsModal(true); }}> |
| app/(tabs)/consultations/index.tsx | 280 | clinic: ['meeting_room', 'var(--bl)', 'var(--bs)', 'عيادة'], |
| app/(tabs)/consultations/index.tsx | 281 | home: ['home_health', 'var(--tl)', 'var(--ts)', 'منزلي'], |
| app/(tabs)/consultations/index.tsx | 282 | online: ['videocam', 'var(--pr)', 'var(--prs)', 'أونلاين'] |
| app/(tabs)/consultations/index.tsx | 390 | clinic: ['meeting_room', 'var(--bl)', 'var(--bs)', 'عيادة'], |
| app/(tabs)/consultations/index.tsx | 391 | home: ['home_health', 'var(--tl)', 'var(--ts)', 'منزلي'], |
| app/(tabs)/consultations/index.tsx | 392 | online: ['videocam', 'var(--pr)', 'var(--prs)', 'أونلاين'] |
| app/(tabs)/consultations/index.tsx | 455 | {['الأعلى تقييماً', 'الأقل سعراً', 'الأقرب'].map(t => ( |
| app/(tabs)/consultations/index.tsx | 464 | {['الكل', 'أخصائي', 'استشاري'].map(t => ( |
| app/(tabs)/consultations/index.tsx | 473 | {['الكل', 'طبيب', 'طبيبة'].map(g => ( |
| app/(tabs)/consultations/index.tsx | 482 | {['الكل', 'أقل من 100', '100 - 200', 'أكثر من 200'].map(p => ( |
| app/(tabs)/consultations/index.tsx | 491 | {['الكل', 'اليوم', 'غداً'].map(a => ( |
| app/(tabs)/health.tsx | 112 | v.label === "الماء اليوم" |
| app/(tabs)/health.tsx | 203 | title="مؤشراتك الحيوية" |
| app/(tabs)/health.tsx | 289 | title="مواعيدك القادمة" |
| app/(tabs)/index.tsx | 25 | ['استشارات', 'stethoscope', 'var(--p)', 'var(--ps)', 's0'], |
| app/(tabs)/index.tsx | 26 | ['صيدلية', 'prescriptions', 'var(--pr)', 'var(--prs)', 's1'], |
| app/(tabs)/index.tsx | 27 | ['تحاليل', 'science', 'var(--tl)', 'var(--ts)', 's2'], |
| app/(tabs)/index.tsx | 28 | ['تمريض', 'home_health', 'var(--bl)', 'var(--bs)', 's3'], |
| app/(tabs)/index.tsx | 29 | ['التغذية', 'nutrition', 'var(--gr)', 'var(--grs)', 's139'], |
| app/(tabs)/index.tsx | 30 | ['الأمومة', 'pregnant_woman', 'var(--pk)', 'var(--pks)', 's154'], |
| app/(tabs)/index.tsx | 31 | ['الخريطة', 'pin_drop', 'var(--tl)', 'var(--ts)', 's116'], |
| app/(tabs)/index.tsx | 32 | ['صحتي', 'ecg_heart', 'var(--cr)', 'var(--cs)', 's4'], |
| app/(tabs)/index.tsx | 33 | ['إسعاف', 'emergency', 'var(--or)', 'var(--ors)', 's158'] |
| app/(tabs)/index.tsx | 37 | ['المساعد الطبي الذكي', 'robot', 'var(--p)', 's47'], |
| app/(tabs)/index.tsx | 38 | ['مترجم روشتات', 'translate', 'var(--pr)', 's135'], |
| app/(tabs)/index.tsx | 39 | ['تحليل البشرة', 'face-woman', 'var(--pk)', 's136'], |
| app/(tabs)/index.tsx | 40 | ['تقرير شهري', 'chart-line', 'var(--tl)', 's137'] |
| app/(tabs)/index.tsx | 198 | <TouchableOpacity activeOpacity={0.8} style={[styles.healthBanner, { borderColor: resolveColor('var(--prs)') }]} onPress={() => go('s19', 'تذكير صحي')}> |
| app/(tabs)/index.tsx | 258 | <TouchableOpacity activeOpacity={0.7} style={[styles.allServices, { backgroundColor: colors.s, borderColor: colors.bd }]} onPress={() => go('s158', 'كل الخدمات')}> |
| app/(tabs)/pharmacy.tsx | 87 | setCategoriesData([{ id: 'all', label: 'الكل', icon: 'apps' }, ...mapped]); |
| app/(tabs)/pharmacy.tsx | 410 | [{ text: isRTL ? 'موافق' : 'OK' }] |
| app/(tabs)/services.tsx | 117 | <SectionHeader title="الخدمات الرئيسية" /> |
| app/(tabs)/services.tsx | 161 | <SectionHeader title="خدمات إضافية" /> |
| app/ai/chat-doctor.tsx | 39 | suggestions: ['عندي صداع', 'اريد فهم تحاليلي', 'احجز لي موعد', 'معلومات عن دواء'], |
| app/ai/chat-doctor.tsx | 91 | options = ['احجز موعد', 'سأكتفي بهذا']; |
| app/ai/skin-analysis.tsx | 40 | products: ['مرطب نيفيا', 'سيروم فيتامين C', 'كريم SPF 50'], |
| app/ai/skin-analysis.tsx | 50 | const [selectedArea, setSelectedArea] = useState('الوجه'); |
| app/ai/skin-analysis.tsx | 53 | const BODY_AREAS = ['الوجه', 'اليدان', 'الظهر', 'الجسم']; |
| app/ai/skin-analysis.tsx | 115 | recommendations: res.recommendations \|\| ['استخدم غسول لطيف للبشرة', 'تجنب الفرك الشديد'], |
| app/ai/skin-analysis.tsx | 155 | {['تحليل لون البشرة', 'قياس مستوى الترطيب', 'فحص البنية الجلدية', 'مقارنة بقاعدة بيانات ضخمة'].map((s, i) => ( |
| app/ai/symptom-checker.tsx | 39 | symptoms: ["صداع", "دوار", "ألم في الرأس"], |
| app/ai/symptom-checker.tsx | 46 | symptoms: ["التهاب حلق", "بلع صعب"], |
| app/ai/symptom-checker.tsx | 53 | symptoms: ["ألم صدر", "ضيق تنفس", "سعال"], |
| app/ai/symptom-checker.tsx | 60 | symptoms: ["ألم بطن", "غثيان", "إسهال"], |
| app/ai/symptom-checker.tsx | 67 | symptoms: ["ألم ذراع", "تنميل"], |
| app/ai/symptom-checker.tsx | 74 | symptoms: ["ألم ذراع", "تنميل"], |
| app/ai/symptom-checker.tsx | 81 | symptoms: ["ألم أسفل البطن", "ألم في الظهر"], |
| app/ai/symptom-checker.tsx | 88 | symptoms: ["ألم ساق", "تورم", "تشنج"], |
| app/ai/symptom-checker.tsx | 95 | symptoms: ["ألم ساق", "تورم", "تشنج"], |
| app/ai/symptom-checker.tsx | 131 | const SEVERITY_OPTIONS = ["خفيف", "متوسط", "شديد", "شديد جداً"]; |
| app/ai/symptom-timeline.tsx | 20 | symptoms: ["صداع", "حمى"], |
| app/ai/symptom-timeline.tsx | 26 | symptoms: ["تعب", "ألم حلق"], |
| app/ai/symptom-timeline.tsx | 30 | { date: "3 أيام", symptoms: ["سعال"], severity: "خفيف", color: "#5BA84F" }, |
| app/ai/triage.tsx | 75 | tests: u === 'emergency' ? ['رسم قلب ECG', 'تحليل إنزيمات القلب'] : ['قياس المؤشرات الحيوية والضغط'], |
| app/ai/triage.tsx | 105 | setMessages([{ id: '1', sender: 'bot', text: 'مرحباً بك في المساعد الطبي الذكي لتصنيف الأعراض. صف لي ما تشعر به باختصار؟' }]); |
| app/ai/triage.tsx | 185 | {['أشعر بألم شديد وثقل في صدري وضيق تنفس', 'أشعر بدوخة شديدة وعطش مستمر ومستوى السكر غير مستقر', 'صداع مستمر وحرارة مرتفعة منذ يومين'].map((s, i) => ( |
| app/ai-assistant.tsx | 122 | <DSBadge label="تشخيص الأعراض" variant="info" style={styles.chip} /> |
| app/ai-assistant.tsx | 123 | <DSBadge label="قراءة روشتة" variant="success" style={styles.chip} /> |
| app/ai-assistant.tsx | 124 | <DSBadge label="معلومات دواء" variant="warning" style={styles.chip} /> |
| app/ai-assistant.tsx | 150 | placeholder="اكتب استفسارك الطبي..." |
| app/community/hub.tsx | 62 | [{ text: "إلغاء", style: "cancel" }, { text: "نشر", onPress: (txt) => { if (txt) Alert.alert("تم النشر", "تم إرسال منشورك للمراجعة والظهور في المجتمع الصحي بنجاح."); } }] |
| app/community/hub.tsx | 81 | <SectionHeader title="الخيارات" /> |
| app/community/hub.tsx | 91 | {["مقالات طبية", "تجارب المرضى", "أسئلة وأجوبة", "قصص نجاح"].map( |
| app/community/hub.tsx | 111 | <SectionHeader title="المنشورات الحالية" /> |
| app/community/post-detail.tsx | 108 | const displayBody = post?.body \|\| "لا يوجد محتوى للمنشور."; |
| app/community/post-detail.tsx | 109 | const authorName = post?.is_anonymous ? "عضو مجهول" : "طبيب معتمد"; |
| app/consultations/appointment-detail.tsx | 50 | const formattedDate = appointment?.scheduled_at ? new Date(appointment.scheduled_at).toLocaleDateString('ar-SA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : 'غداً'; |
| app/consultations/appointment-detail.tsx | 51 | const formattedTime = appointment?.scheduled_at ? new Date(appointment.scheduled_at).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) : '10:00 ص'; |
| app/consultations/booking-confirm.tsx | 174 | Alert.alert('خطأ', err?.message \|\| 'تعذر تأكيد الحجز. الرجاء المحاولة مرة أخرى.'); |
| app/consultations/booking-confirm.tsx | 202 | <SectionHeader title="نوع الزيارة" /> |
| app/consultations/booking-confirm.tsx | 216 | <SectionHeader title="تفاصيل الموعد" /> |
| app/consultations/booking-confirm.tsx | 234 | <SectionHeader title="طريقة الدفع" /> |
| app/consultations/booking-confirm.tsx | 245 | <SectionHeader title="بيانات التأمين" /> |
| app/consultations/booking-confirm.tsx | 296 | <SectionHeader title="ملخص التكلفة" /> |
| app/consultations/booking-confirm.tsx | 351 | label={payMethod === 'insurance' ? 'التحقق من التأمين وتأكيد الحجز' : `تأكيد الحجز ودفع ${total} ر.س`} |
| app/consultations/call-history.tsx | 142 | const title = isCaller ? "اتصال صادر" : "اتصال وارد"; |
| app/consultations/cancel-reschedule.tsx | 18 | const NEW_DAYS = ['الأحد 16', 'الاثنين 17', 'الثلاثاء 18', 'الأربعاء 19', 'الخميس 20']; |
| app/consultations/cancel-reschedule.tsx | 19 | const NEW_TIMES = ['9:00 ص', '9:30 ص', '10:00 ص', '11:00 ص', '2:00 م', '3:00 م', '4:00 م']; |
| app/consultations/chat-with-doctor.tsx | 66 | setMessages(prev => [...prev, { id: newMsg.id, sender: 'doc', text: newMsg.content, time: 'الآن' }]); |
| app/consultations/chat-with-doctor.tsx | 83 | const newMsg = { id: Date.now(), sender: 'me', text: msg, time: 'الآن' }; |
| app/consultations/clinic-location.tsx | 44 | const name = data?.clinic_name \|\| 'العيادة'; |
| app/consultations/doctor/[id].tsx | 25 | const PERIODS = ['صباحي', 'ظهيرة', 'مسائي', 'ليلي']; |
| app/consultations/doctor/[id].tsx | 29 | ['٧:٠٠ ص', '٨:٠٠ ص', '٩:٠٠ ص', '١٠:٠٠ ص', '١١:٠٠ ص'], |
| app/consultations/doctor/[id].tsx | 30 | ['١٢:٠٠ م', '١:٠٠ م', '٢:٠٠ م'], |
| app/consultations/doctor/[id].tsx | 31 | ['٤:٠٠ م', '٥:٠٠ م', '٦:٠٠ م'], |
| app/consultations/doctor/[id].tsx | 32 | ['٨:٠٠ م', '٩:٠٠ م'] |
| app/consultations/doctor/[id].tsx | 94 | const arDays = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت']; |
| app/consultations/doctor/[id].tsx | 96 | const arMonths = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']; |
| app/consultations/doctor/[id].tsx | 102 | const toArNum = (n: number) => n.toString().replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]); |
| app/consultations/doctor/[id].tsx | 356 | {(doc.tags \|\| ['مناظير', 'قولون', 'كبد']).map((t, i) => ( |
| app/consultations/doctor-profile.tsx | 316 | <SectionHeader title="صور العيادة" actionLabel="عرض الكل" /> |
| app/consultations/doctor-profile.tsx | 329 | <SectionHeader title="الخدمات" /> |
| app/consultations/doctor-profile.tsx | 344 | <SectionHeader title="احجز موعدك" actionLabel="اختر اليوم" /> |
| app/consultations/doctor-profile.tsx | 380 | const labels = { morning: 'صباحاً', afternoon: 'مساءً', evening: 'ليلاً' }; |
| app/consultations/doctor-profile.tsx | 538 | <SectionHeader title="الأسئلة الشائعة" /> |
| app/consultations/doctor-profile.tsx | 550 | <SectionHeader title="أطباء مشابهون" actionLabel="عرض الكل" /> |
| app/consultations/doctor-profile.tsx | 581 | label="تأكيد الحجز" |
| app/consultations/doctor-search.tsx | 125 | ["rating", "الأعلى تقييماً"], |
| app/consultations/doctor-search.tsx | 126 | ["price", "الأقل سعراً"], |
| app/consultations/doctor-search.tsx | 127 | ["wait", "الأقل انتظاراً"], |
| app/consultations/follow-up.tsx | 42 | setUpdates(p => [...p, { id: String(Date.now()), date: 'الآن', text: newUpdate, type: 'me' }]); |
| app/consultations/follow-up.tsx | 79 | <SectionHeader title="التشخيص" /> |
| app/consultations/follow-up.tsx | 85 | <SectionHeader title="الأدوية الموصوفة" /> |
| app/consultations/follow-up.tsx | 108 | <SectionHeader title="تحديثات الحالة" /> |
| app/consultations/incoming-call.tsx | 23 | const callerName = (params.callerName as string) \|\| "د. محمد أحمد الكردي"; |
| app/consultations/offer/[id].tsx | 64 | const arDays = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت']; |
| app/consultations/offer/[id].tsx | 66 | const arMonths = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']; |
| app/consultations/offer/[id].tsx | 71 | const toArNum = (n: number) => n.toString().replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]); |
| app/consultations/offer/[id].tsx | 90 | const perArr = lang === 'ar' ? ['صباحي', 'ظهيرة', 'مسائي', 'ليلي'] : ['Morning', 'Noon', 'Evening', 'Night']; |
| app/consultations/offer/[id].tsx | 91 | const timesArr = lang === 'ar' ? [['٧:٠٠ ص', '٨:٠٠ ص', '٩:٠٠ ص'], ['١٢:٠٠ م', '١:٠٠ م', '٢:٠٠ م'], ['٤:٠٠ م', '٥:٠٠ م'], ['٩:٠٠ م', '١٠:٠٠ م']] : [['7:00 AM', '8:00 AM'], ['12:00 PM', '1:00 PM'], ['4:00 PM'], ['9:00 PM']]; |
| app/consultations/post-call-rating.tsx | 19 | const RATING_LABELS = ['', 'سيئ', 'مقبول', 'جيد', 'ممتاز', 'رائع جداً']; |
| app/consultations/post-call-rating.tsx | 20 | const TAGS = ['ممتاز', 'سريع', 'احترافي', 'نظيف', 'متعاون', 'أنصح به']; |
| app/consultations/prescription-from-doctor.tsx | 122 | label="وصفة رسمية" |
| app/consultations/prescription-from-doctor.tsx | 130 | <SectionHeader title="التشخيص" /> |
| app/consultations/prescription-from-doctor.tsx | 145 | title={`الأدوية (${prescription.medications?.length \|\| 0})`} |
| app/consultations/prescription-from-doctor.tsx | 214 | label={added ? "تمت الإضافة " : "إضافة للتذكير"} |
| app/consultations/prescription-from-doctor.tsx | 224 | label="التفاصيل" |
| app/consultations/prescription-from-doctor.tsx | 245 | <SectionHeader title={`التحاليل المطلوبة (${prescription.labs.length})`} /> |
| app/consultations/prescription-from-doctor.tsx | 322 | label="طلب من الصيدلية" |
| app/consultations/prescription-from-doctor.tsx | 332 | label="احجز موعد مختبر" |
| app/consultations/prescription-from-doctor.tsx | 341 | label="تحميل PDF" |
| app/consultations/share-report.tsx | 95 | <SectionHeader title="اختر التقارير للمشاركة" /> |
| app/consultations/share-report.tsx | 152 | label="رفع تقرير جديد" |
| app/consultations/share-report.tsx | 171 | label={`مشاركة ${selected.length} تقرير مع الطبيب`} |
| app/delivery/address-select.tsx | 81 | <SectionHeader title="العناوين المحفوظة" /> |
| app/delivery/address-select.tsx | 108 | name={addr.label === 'العمل' ? 'hospital' : 'home'} |
| app/delivery/address-select.tsx | 145 | label="تأكيد العنوان" |
| app/diagnostics/book-sample.tsx | 29 | <SectionHeader title="مكان سحب العينة" /> |
| app/diagnostics/book-sample.tsx | 80 | <SectionHeader title="اختر التاريخ" /> |
| app/diagnostics/book-sample.tsx | 82 | {[{ key: 'today', label: 'اليوم' }, { key: 'tomorrow', label: 'غداً' }, { key: 'after', label: 'بعد غد' }].map(d => ( |
| app/diagnostics/book-sample.tsx | 89 | <SectionHeader title="اختر الوقت" /> |
| app/diagnostics/book-sample.tsx | 99 | <SectionHeader title="التحاليل المطلوبة" /> |
| app/diagnostics/book-sample.tsx | 112 | <SectionHeader title="تعليمات قبل السحب" /> |
| app/diagnostics/booking-confirm.tsx | 134 | <SectionHeader title="التحاليل المطلوبة" /> |
| app/diagnostics/booking-confirm.tsx | 148 | <SectionHeader title="مكان سحب العينة" /> |
| app/diagnostics/booking-confirm.tsx | 204 | <SectionHeader title="طريقة الدفع" /> |
| app/diagnostics/booking-confirm.tsx | 214 | <SectionHeader title="تفاصيل التأمين" /> |
| app/diagnostics/booking-confirm.tsx | 234 | <SectionHeader title="ملخص التكلفة" /> |
| app/diagnostics/booking-confirm.tsx | 262 | label={payMethod === 'insurance' ? 'التحقق من التأمين والحجز' : `تأكيد ودفع ${total} ر.س`} |
| app/diagnostics/checkout.tsx | 19 | const dayNames = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']; |
| app/diagnostics/checkout.tsx | 45 | const labName = params.labName \|\| 'مختبرات البرج'; |
| app/diagnostics/checkout.tsx | 47 | const totalParam = params.copay ? `${params.copay}` : (params.total \|\| '٢٩٩'); |
| app/diagnostics/checkout.tsx | 66 | const isCTorXRay = radiologyType.includes('مقطعية') \|\| radiologyType.includes('CT') \|\| radiologyType.includes('سينية') \|\| radiologyType.includes('X-Ray'); |
| app/diagnostics/checkout.tsx | 67 | const isMRI = radiologyType.includes('رنين') \|\| radiologyType.includes('MRI'); |
| app/diagnostics/insurance-approval.tsx | 20 | const labName = (params.labName as string) \|\| 'المختبر المختار'; |
| app/diagnostics/insurance-approval.tsx | 159 | const isCovered = item.status === 'مغطى'; |
| app/diagnostics/lab-comparison.tsx | 24 | const testName = name \|\| "باقة الفحص الشامل"; |
| app/diagnostics/my-results.tsx | 87 | const labName = b.provider_name \|\| "مختبر معتمد"; |
| app/diagnostics/my-results.tsx | 94 | let statusText = "قيد المراجعة"; |
| app/diagnostics/orders.tsx | 31 | title: b.items?.[0]?.name_ar \|\| b.items?.[0]?.name_en \|\| 'حجز تحاليل مخبرية', |
| app/diagnostics/packages.tsx | 20 | const [activeCat, setActiveCat] = useState("الكل"); |
| app/diagnostics/packages.tsx | 23 | const [categories, setCategories] = useState<string[]>(["الكل"]); |
| app/diagnostics/packages.tsx | 32 | setCategories(["الكل", ...cats]); |
| app/diagnostics/results-history.tsx | 64 | const title = item.items?.map((i: any) => i.name_ar).join(' + ') \|\| 'تحاليل مخبرية'; |
| app/diagnostics/results-history.tsx | 65 | const labName = item.provider_name \|\| 'مختبر معتمد'; |
| app/diagnostics/sample-tracking.tsx | 148 | const tests = booking.items?.map((i: any) => i.name_ar \|\| i.name_en) \|\| ['تحاليل مخبرية']; |
| app/diagnostics/technician-tracking.tsx | 123 | label={status === "on_way" ? "في الطريق" : "وصل"} |
| app/diagnostics/technician-tracking.tsx | 132 | {(booking?.items?.map((i: any) => i.name_ar \|\| i.name_en) \|\| ["تحاليل مخبرية"]).map((t: string, i: number) => ( |
| app/diagnostics/technician-tracking.tsx | 152 | label="اتصل بالفني" |
| app/diagnostics/technician-tracking.tsx | 160 | label="رسالة" |
| app/drug-scanner/index.tsx | 32 | const COMMON_DRUGS = ['بنادول', 'إيبوبروفين', 'أموكسيسيلين', 'كلاريثروميسين', 'أوميبرازول', 'لوسارتان', 'فيتامين D', 'أوميغا 3']; |
| app/drug-scanner/index.tsx | 66 | const SEVERITY_LABELS = { major: 'خطير', moderate: 'متوسط', minor: 'خفيف' }; |
| app/drug-scanner/index.tsx | 75 | {['فحص التفاعلات الثنائية', 'تحليل التداخلات المعروفة', 'مراجعة جرعات الأمان', 'توليد التوصيات'].map((s, i) => ( |
| app/emergency/sos-active.tsx | 18 | const [dispatchStatus, setDispatchStatus] = useState('لم يتم استلام حالة طوارئ نشطة بعد.'); |
| app/family/calendar.tsx | 222 | <SectionHeader title={`أحداث ${DAYS[selectedDay]}`} /> |
| app/family/calendar.tsx | 224 | label="إضافة حدث " |
| app/family/chat.tsx | 46 | setMessages(p => [...p, { id: String(Date.now()), text: msg, sender: 'أنت', time: 'الآن', type: 'text', isMe: true }]); |
| app/family/emergency-contacts.tsx | 93 | <SectionHeader title={`جهات الطوارئ (${CONTACTS.length})`} /> |
| app/family/emergency-contacts.tsx | 135 | label="إضافة جهة اتصال طوارئ" |
| app/family/hub.tsx | 73 | const [group, setGroup] = useState<any>({ name: "عائلة أحمد" }); |
| app/family/hub.tsx | 157 | <SectionHeader title="أفراد العائلة" /> |
| app/family/invite.tsx | 68 | <SectionHeader title="بيانات الفرد (اختياري)" /> |
| app/family/invite.tsx | 78 | <SectionHeader title="طريقة الدعوة" /> |
| app/family/join.tsx | 83 | label="الذهاب للعائلة" |
| app/family/join.tsx | 139 | label="بحث" |
| app/family/join.tsx | 146 | label="مسح QR Code بالكاميرا" |
| app/family/join.tsx | 193 | label="قبول الدعوة" |
| app/family/join.tsx | 200 | label="رفض" |
| app/family/member-health.tsx | 33 | const memberName = (params.name as string) \|\| "فاطمة أحمد"; |
| app/family/member-health.tsx | 34 | const memberRelation = (params.relation as string) \|\| "ابنة"; |
| app/family/member-health.tsx | 169 | label={`${member.age} سنة`} |
| app/family/member-health.tsx | 181 | <SectionHeader title="المؤشرات الحيوية" /> |
| app/family/member-health.tsx | 200 | <SectionHeader title="الأدوية" /> |
| app/family/member-health.tsx | 228 | <SectionHeader title="الموعد القادم" /> |
| app/family/member-health.tsx | 254 | label="محادثة" |
| app/family/member-health.tsx | 260 | label="مكالمة صوتية" |
| app/family/member-health.tsx | 266 | label="حجز موعد نيابةً" |
| app/family/permission-request.tsx | 113 | <SectionHeader title="الصلاحيات المطلوبة" /> |
| app/family/permission-request.tsx | 126 | label={perm.granted ? 'مسموح' : 'مرفوض'} |
| app/family/permissions.tsx | 106 | const memberName = (params.name as string) \|\| "فرد من العائلة"; |
| app/family/permissions.tsx | 107 | const memberRelation = (params.relation as string) \|\| "قريب"; |
| app/family/permissions.tsx | 286 | label="إزالة الفرد من العائلة" |
| app/family/permissions.tsx | 343 | label="طلب تعديل الصلاحيات" |
| app/family/shared-calendar.tsx | 223 | <SectionHeader title={`أحداث ${DAYS[selectedDay]}`} /> |
| app/family/shared-calendar.tsx | 225 | label="إضافة حدث " |
| app/family/voice-call.tsx | 54 | label={muted ? "رفع الصوت" : "كتم"} |
| app/family/voice-call.tsx | 60 | label="مكبّر" |
| app/family/voice-call.tsx | 66 | label="رسالة" |
| app/health/chronic-disease.tsx | 54 | {[{ num: conditions.length.toString(), label: 'حالة' }, { num: conditions.filter(c => c.controlled).length.toString(), label: 'تحت السيطرة' }, { num: conditions.reduce((acc, c) => acc + (c.medications?.length \|\| 0), 0).toString(), label: 'أدوية' }].map((s, i) => ( |
| app/health/conditions-allergies.tsx | 81 | const [myAllergies, setMyAllergies] = useState<string[]>(["بنسلين"]); |
| app/health/conditions-allergies.tsx | 151 | <SectionHeader title="الأمراض المزمنة" /> |
| app/health/conditions-allergies.tsx | 211 | <SectionHeader title="الحساسية" /> |
| app/health/conditions-allergies.tsx | 300 | label="حفظ" |
| app/health/edit-profile.tsx | 29 | const GENDERS = ["ذكر", "أنثى"]; |
| app/health/edit-profile.tsx | 222 | <Field label="الاسم الكامل" field="name" iconName="edit" /> |
| app/health/edit-profile.tsx | 224 | label="رقم الجوال" |
| app/health/edit-profile.tsx | 230 | label="البريد الإلكتروني" |
| app/health/edit-profile.tsx | 235 | <Field label="تاريخ الميلاد" field="dob" iconName="calendar_today" /> |
| app/health/edit-profile.tsx | 237 | label="رقم الهوية" |
| app/health/family-hub.tsx | 190 | label="إنشاء مجموعة عائلية" |
| app/health/family-hub.tsx | 197 | label="انضم لعائلة حالية" |
| app/health/family-hub.tsx | 227 | <SectionHeader title="أفراد العائلة" /> |
| app/health/medication-reminder-add.tsx | 27 | const TIME_PRESETS = ['06:00 ص', '08:00 ص', '12:00 م', '02:00 م', '06:00 م', '08:00 م', '10:00 م']; |
| app/health/medication-reminder-add.tsx | 40 | const [selectedTimes, setSelectedTimes] = useState<string[]>(['08:00 ص', '08:00 م']); |
| app/health/medication-reminder-add.tsx | 74 | <SectionHeader title="اسم الدواء" /> |
| app/health/medication-reminder-add.tsx | 84 | <SectionHeader title="الجرعة" /> |
| app/health/medication-reminder-add.tsx | 115 | <SectionHeader title="مواعيد الجرعات" /> |
| app/health/medication-reminder-add.tsx | 131 | <SectionHeader title="تعليمات" /> |
| app/health/medication-reminder-add.tsx | 141 | <SectionHeader title="التكرار" /> |
| app/health/medication-reminder-add.tsx | 147 | <SectionHeader title="المدة" /> |
| app/health/medication-reminder-list.tsx | 116 | <SectionHeader title={`في الانتظار (${pending.length})`} /> |
| app/health/medication-reminder-list.tsx | 166 | label="تم أخذها" |
| app/health/medication-reminder-list.tsx | 175 | label="غفوة 30 دق" |
| app/health/medication-reminder-list.tsx | 216 | <SectionHeader title={`تم أخذها (${done.length})`} /> |
| app/health/prescriptions.tsx | 51 | {[{ num: prescriptions.length.toString(), label: 'وصفة' }, { num: prescriptions.reduce((acc, p) => acc + (p.medications?.length \|\| 0), 0).toString(), label: 'دواء' }, { num: prescriptions.filter(p => !p.isPurchased).length.toString(), label: 'معلقة' }].map((s, i) => ( |
| app/health/refills.tsx | 87 | <SectionHeader title="مستوى مخزون أدويتك المزمنة" /> |
| app/health/refills.tsx | 100 | label={isCritical ? `حرج: ${med.remainingDays} أيام متبقية` : `${med.remainingDays} يوماً متبقياً`} |
| app/health/refills.tsx | 120 | label="أعد صرف الدواء الآن" |
| app/health/reminders.tsx | 177 | <SectionHeader title="جرعات اليوم" /> |
| app/health/sleep-score.tsx | 48 | const scoreLabel = SLEEP_DATA.score >= 80 ? 'ممتاز' : SLEEP_DATA.score >= 60 ? 'جيد' : 'يحتاج تحسين'; |
| app/health/sleep-tracker.tsx | 30 | const QUALITY_LABELS = { excellent: 'ممتاز', good: 'جيد', fair: 'متوسط', poor: 'ضعيف' }; |
| app/health/smart-reminders.tsx | 93 | {([['all', 'الكل'], ['ai', 'AI ذكي'], ['medications', 'أدوية']] as const).map(([key, label]) => ( |
| app/health/vitals-log.tsx | 172 | <SectionHeader title={`${config.label} — آخر ${periodLabels[period]}`} /> |
| app/health/vitals-log.tsx | 188 | <SectionHeader title="آخر القراءات" /> |
| app/health/vitals.tsx | 175 | label="إضافة قراءة جديدة" |
| app/health/vitals.tsx | 181 | label="عرض الرسوم البيانية" |
| app/insurance/copay.tsx | 63 | <Header title={isRTL ? 'موافقة التأمين' : 'Insurance Approval'} /> |
| app/insurance/coverage-check.tsx | 48 | {['فحص شبكة المزودين', 'حساب نسبة التغطية', 'التحقق من الحد السنوي'].map((s, i) => ( |
| app/insurance/hub.tsx | 186 | [{ text: 'موافق' }] |
| app/insurance/submit-claim.tsx | 81 | <SectionHeader title="الخيارات" /> |
| app/loyalty/hub.tsx | 19 | { id: 'bronze', label: 'برونزي', icon: 'emoji_events', color: '#CD7C3C', minPts: 0, maxPts: 1000, perks: ['5% كاشباك'] }, |
| app/loyalty/hub.tsx | 197 | {([['earn', 'اكسب نقاطاً'], ['redeem', 'استبدال'], ['activity', 'السجل']] as const).map(([t, l]) => ( |
| app/loyalty/referrals.tsx | 171 | label="نسخ الكود" |
| app/loyalty/referrals.tsx | 178 | label="مشاركة الكود" |
| app/loyalty/referrals.tsx | 208 | <SectionHeader title="سجل الإحالات والمدعوين" /> |
| app/loyalty/rewards.tsx | 74 | [{ text: 'حسناً' }] |
| app/loyalty/rewards.tsx | 119 | <SectionHeader title="المكافآت المتاحة" /> |
| app/map/index.tsx | 569 | ? [{ icon: 'wallet', val: `${selectedProvider.price} ر.س`,   lbl: 'السعر',    color: '#10B981' }] |
| app/maternity/baby-development.tsx | 35 | milestones: ['انقسام الخلية البكر في اتجاه الرحم', 'تجهيز بطانة الرحم وتثبيت الهرمونات'], |
| app/maternity/baby-development.tsx | 36 | tips: ['تناولي حمض الفوليك (400 ميكروجرام) يومياً.', 'تجنبي التدخين والكافيين تماماً.'] |
| app/maternity/baby-development.tsx | 41 | milestones: ['حدوث التخصيب وانقسام النواة الأولى', 'تحرك البويضة الملقحة نحو جدار الرحم'], |
| app/maternity/baby-development.tsx | 42 | tips: ['حافظي على علاقة زوجية منتظمة في أيام الخصوبة.', 'احرصي على تناول الفيتامينات والمعادن.'] |
| app/maternity/baby-development.tsx | 47 | milestones: ['انغراس الكيسة الأريمية وتثبيت الحمل أولياً', 'بدء إفراز هرمون الحمل HCG'], |
| app/maternity/baby-development.tsx | 48 | tips: ['قد تشعرين بنزف الانغراس الخفيف وهو طبيعي.', 'تجنبي المجهود البدني العنيف.'] |
| app/maternity/baby-development.tsx | 53 | milestones: ['تكون الطبقات الجنينية الثلاث الأساسية', 'تكون الأنبوب العصبي والحبل الشوكي البدائي'], |
| app/maternity/baby-development.tsx | 54 | tips: ['قومي بعمل اختبار حمل منزلي لتأكيد النتيجة.', 'احجزي موعدك الأول مع الطبيبة.'] |
| app/maternity/baby-development.tsx | 59 | milestones: ['النبض الأول للقلب البدائي للجنين', 'تكون الحبل السري الأولي لتغذية الجنين'], |
| app/maternity/baby-development.tsx | 60 | tips: ['ابدئي المتابعة الدورية والفحوصات الطبية الأولى.', 'تناولي وجبات خفيفة لمقاومة الغثيان الصباحي.'] |
| app/maternity/baby-development.tsx | 65 | milestones: ['انقسام الدماغ لثلاثة أجزاء رئيسية', 'تطور ملامح الوجه البدائية وظهور نقطتي العينين'], |
| app/maternity/baby-development.tsx | 66 | tips: ['تناولي وجبات صغيرة مقسمة على مدار اليوم.', 'اشربي الزنجبيل الدافئ لتخفيف الغثيان.'] |
| app/maternity/baby-development.tsx | 71 | milestones: ['تكون نصفي الكرة المخية وتضاعف خلايا الدماغ', 'تكون الغدة الدرقية وبراعم الأصابع البدائية'], |
| app/maternity/baby-development.tsx | 72 | tips: ['تجنبي الروائح النفاذة التي تثير الغثيان.', 'حافظي على روتين ترطيب خفيف للبشرة.'] |
| app/maternity/baby-development.tsx | 77 | milestones: ['تكون المرفقين والركبتين وبداية حركات غير محسوسة', 'تطور شبكية العين وبداية بناء هيكل الأذن الداخلية'], |
| app/maternity/baby-development.tsx | 78 | tips: ['احصلي على قسط كافٍ من النوم والراحة.', 'اهتمي بتناول الألياف لتجنب الإمساك.'] |
| app/maternity/baby-development.tsx | 83 | milestones: ['اختفاء الذيل الجنيني وتطور الجهاز العضلي', 'تكون بصيلات الشعر وبراعم التذوق في اللسان'], |
| app/maternity/baby-development.tsx | 84 | tips: ['اشربي الكثير من السوائل والماء (على الأقل 2 لتر يومياً).', 'احرصي على تناول الحليب المدعم.'] |
| app/maternity/baby-development.tsx | 89 | milestones: ['بدء عمل الكبد والكليتين لإفراز البول والصفراء', 'تكون مفاصل الأطراف وأظافر الأصابع الدقيقة'], |
| app/maternity/baby-development.tsx | 90 | tips: ['مارسي رياضة المشي الخفيف لتنشيط الدورة الدموية.', 'تجنبي الوقوف الطويل أو المفاجئ.'] |
| app/maternity/baby-development.tsx | 95 | milestones: ['تكون الأسنان اللبنية تحت خط اللثة الجنيني', 'تطور الأعضاء التناسلية الخارجية داخلياً'], |
| app/maternity/baby-development.tsx | 96 | tips: ['اهتمي بالأطعمة الغنية بالكالسيوم لنمو العظام.', 'احرصي على فحص مستوى فيتامين د.'] |
| app/maternity/baby-development.tsx | 101 | milestones: ['اكتمال ردود الأفعال الانعكاسية (فتح وقفل قبضة اليد)', 'تكون الغدة النخامية وبدء إفراز الهرمونات'], |
| app/maternity/baby-development.tsx | 102 | tips: ['هذا آخر أسبوع في الثلث الأول، سيبدأ الغثيان بالتحسن قريباً.', 'استشيري طبيبتك حول فيتامينات الثلث الثاني.'] |
| app/maternity/baby-development.tsx | 107 | milestones: ['تكون البصمات على أصابع اليدين والقدمين', 'تكون الحبال الصوتية البدائية وتطور البنكرياس'], |
| app/maternity/baby-development.tsx | 108 | tips: ['ابدئي بالإعلان عن الحمل للمقربين إذا كنتِ جاهزة.', 'اهتمي بتناول مكملات الحديد والبروتينات.'] |
| app/maternity/baby-development.tsx | 113 | milestones: ['نمو زغب الشعر الناعم لحماية الجلد (Lanugo)', 'القدرة على مص الإبهام والعبوس والابتسام'], |
| app/maternity/baby-development.tsx | 114 | tips: ['استغلي طاقة الثلث الثاني في تنظيم وجباتك ونشاطك الخفيف.', 'نامي على وسائد مريحة لدعم الظهر.'] |
| app/maternity/baby-development.tsx | 119 | milestones: ['حساسية العين للضوء الخارجي بالرغم من إغلاق الجفون', 'تكون الهيكل العظمي الغضروفي وبدء تصلبه'], |
| app/maternity/baby-development.tsx | 120 | tips: ['ارتدي ملابس قطنية فضفاضة ومريحة.', 'تابعي ضغط الدم بانتظام لتجنب الارتفاع المفاجئ.'] |
| app/maternity/baby-development.tsx | 125 | milestones: ['ضخ القلب لحوالي 25 لتر من الدم يومياً', 'الشعور بأولى حركات الجنين الخفيفة (الرفرفة)'], |
| app/maternity/baby-development.tsx | 126 | tips: ['احجزي موعد السونار التفصيلي التشريحي (Anomaly Scan).', 'تجنبي الاستلقاء على الظهر لفترات طويلة.'] |
| app/maternity/baby-development.tsx | 131 | milestones: ['تراكم الدهون البنية المفيدة تحت الجلد وعزل الحرارة', 'تصلب عظام الأذن الوسطى وبداية نقل الأصوات'], |
| app/maternity/baby-development.tsx | 132 | tips: ['احرصي على النوم على الجانب الأيسر لدعم تدفق الدم للمشيمة.', 'تناولي أطعمة غنية بـ أوميجا 3.'] |
| app/maternity/baby-development.tsx | 137 | milestones: ['تطور السمع الكامل وسماع نبضات قلبك والأصوات الخارجية', 'تكون طبقة الميالين حول الحبل الشوكي لحمايته'], |
| app/maternity/baby-development.tsx | 138 | tips: ['تحدثي مع جنينك واقرئي له بصوت هادئ.', 'تجنبي الأصوات العالية والضوضاء المزعجة.'] |
| app/maternity/baby-development.tsx | 143 | milestones: ['تكون طلاء الفيرنكس الدهني (Vernix) لحماية الجلد', 'تطور الحواس الخمس في الدماغ (المناطق المخصصة لها)'], |
| app/maternity/baby-development.tsx | 144 | tips: ['استخدمي كريمات طبيعية لترطيب بطنك ومنع علامات التمدد.', 'حافظي على شرب الماء بانتظام.'] |
| app/maternity/baby-development.tsx | 149 | milestones: ['ابتلاع السائل لتمرين الجهاز الهضمي والبلع', 'تكون دورات نوم ويقظة شبيهة بالأطفال حديثي الولادة'], |
| app/maternity/baby-development.tsx | 150 | tips: ['تأكدي من عمل فحص الدم والحديد للاطمئنان على مستويات الهيموجلوبين.', 'خذي قسطاً من الراحة عند التعب.'] |
| app/maternity/baby-development.tsx | 155 | milestones: ['إنتاج خلايا الدم الحمراء بواسطة نخاع العظم بدلاً من الكبد', 'تطور حركة الجنين لتشمل الركل والتقلب بوضوح'], |
| app/maternity/baby-development.tsx | 156 | tips: ['ارفعي قدميك عند الجلوس لتقليل تورم الكاحلين.', 'تجنبي الوقوف الطويل والمستمر.'] |
| app/maternity/baby-development.tsx | 161 | milestones: ['ظهور الحواجب والرموش والشفتين بملامح واضحة', 'استكشاف الجنين لمحيطه بلمس جدار الرحم والوجه'], |
| app/maternity/baby-development.tsx | 162 | tips: ['احرصي على تناول اللحوم الحمراء والسبانخ لزيادة مخزون الحديد.', 'مارسي تمارين كيجل بعد استشارة الطبيبة.'] |
| app/maternity/baby-development.tsx | 167 | milestones: ['تطور الأذن الداخلية وسرعة الاستجابة للصوت الخارجي', 'تكون الأوعية الدموية في الرئة استعداداً للتنفس'], |
| app/maternity/baby-development.tsx | 168 | tips: ['حافظي على هدوئك وتجنبي التوتر لأنه يؤثر على نبض الجنين.', 'احرصي على ترطيب الجسم.'] |
| app/maternity/baby-development.tsx | 173 | milestones: ['تكون أكياس الرئة الهوائية وبداية إفراز مادة السورفاكتانت', 'امتلاء البشرة والجلد بالدهون ليصبح أقل تجعداً'], |
| app/maternity/baby-development.tsx | 174 | tips: ['قومي بعمل فحص تحمل الجلوكوز لتشخيص سكر الحمل في هذا الوقت.', 'استمري في تناول الفيتامينات.'] |
| app/maternity/baby-development.tsx | 179 | milestones: ['الاستجابة الحركية والقلبية المباشرة لصوت الأم والوالد', 'تطور بنية المخ والاتصالات العصبية المعقدة'], |
| app/maternity/baby-development.tsx | 180 | tips: ['تجنبي النوم تماماً على الظهر، واعتمدي الجانب الأيسر.', 'احرصي على وجبات تحتوي على الكالسيوم.'] |
| app/maternity/baby-development.tsx | 185 | milestones: ['انفتاح جفون العينين وتطور الجهاز العصبي البصري', 'استنشاق الجنين للسائل الأمنيوسي لتمرين الرئتين'], |
| app/maternity/baby-development.tsx | 186 | tips: ['مارسي تمارين التمدد الخفيفة للتخلص من آلام أسفل الظهر.', 'تجنبي المجهود الشديد.'] |
| app/maternity/baby-development.tsx | 191 | milestones: ['انتظام نشاط الموجات الدماغية وتطور النوم العميق', 'اكتمال نمو الهيكل البصري وقدرته على الرمش'], |
| app/maternity/baby-development.tsx | 192 | tips: ['ابدئي بتجهيز حقيبة الولادة والتسوق لمستلزمات الرضيع.', 'احرصي على المتابعة الدورية.'] |
| app/maternity/baby-development.tsx | 197 | milestones: ['تطور القدرة على الإبصار وتمييز الضوء المتسرب', 'بدء إنتاج خلايا الدم الحمراء بالكامل في نخاع العظام'], |
| app/maternity/baby-development.tsx | 198 | tips: ['تابعي حركة الجنين يومياً (يجب ألا تقل عن 10 حركات في ساعتين).', 'تجنبي الوجبات الحارة لمنع الحموضة.'] |
| app/maternity/baby-development.tsx | 203 | milestones: ['تطور القوة العضلية وركلات قوية تشعر بها الأم بوضوح', 'تراكم الكالسيوم بكثافة في عظام الجنين لبنائها'], |
| app/maternity/baby-development.tsx | 204 | tips: ['تناولي الحليب والأجبان بكثرة لدعم عظام الجنين.', 'احرصي على تمارين التنفس والاسترخاء.'] |
| app/maternity/baby-development.tsx | 209 | milestones: ['تطور تلافيف الدماغ وزيادة سرعة النبضات العصبية', 'تساقط زغب الشعر الجنيني الناعم وبقاء طلاء الفيرنكس'], |
| app/maternity/baby-development.tsx | 210 | tips: ['تجنبي حمل الأشياء الثقيلة لحماية أسفل ظهرك وحوضك.', 'جهزي رقم الطبيب والطوارئ في مكان بارز.'] |
| app/maternity/baby-development.tsx | 215 | milestones: ['اكتمال عمل الحواس الخمس وإرسال الإشارات للدماغ', 'توجيه الرأس وتدويره نحو مصادر الضوء القريبة'], |
| app/maternity/baby-development.tsx | 216 | tips: ['قللي من تناول الموالح والمخللات لتجنب احتباس السوائل.', 'ارفعي قدميك كلما أتيحت الفرصة.'] |
| app/maternity/baby-development.tsx | 221 | milestones: ['اتخاذ الجنين لوضعية الرأس للأسفل (Cephalic) استعداداً للولادة', 'تصلب معظم العظام باستثناء عظام الجمجمة المرنة'], |
| app/maternity/baby-development.tsx | 222 | tips: ['اجعلي زيارات المتابعة الطبية كل أسبوعين من الآن فصاعداً.', 'احرصي على المشي الخفيف اليومي.'] |
| app/maternity/baby-development.tsx | 227 | milestones: ['بقاء عظام الجمجمة غير ملتحمة لتتداخل أثناء المخاض', 'تطور الجهاز المناعي الذاتي عبر نقل الأجسام المضادة للأم'], |
| app/maternity/baby-development.tsx | 228 | tips: ['تجنبي الجلوس الطويل دون حركة لتفادي جلطات الساق وتورم القدمين.', 'اشربي الكثير من الماء.'] |
| app/maternity/baby-development.tsx | 233 | milestones: ['نضوج الرئتين الكامل وقدرتهما على التنفس الذاتي', 'تطور الجهاز العصبي المركزي وتنسيق حركات التنفس والبلع'], |
| app/maternity/baby-development.tsx | 234 | tips: ['تأكدي من تجهيز حقيبة المستشفى وأغراض الرضيع بالكامل.', 'احصلي على قسط وافر من الراحة والنوم.'] |
| app/maternity/baby-development.tsx | 239 | milestones: ['تراكم الدهون تحت الجلد ليصبح ناعماً ووردياً بالكامل', 'نمو أظافر اليدين لتغطي أطراف الأصابع بالكامل'], |
| app/maternity/baby-development.tsx | 240 | tips: ['تعرفي على أعراض الطلق الفعلي والفرق بينه وبين الطلق الكاذب.', 'تابعي حركة الجنين بدقة.'] |
| app/maternity/baby-development.tsx | 245 | milestones: ['نزول رأس الجنين في تجويف الحوض (Engagement)', 'اكتمال نمو كافة أجهزة الجسم واستقرار الوزن'], |
| app/maternity/baby-development.tsx | 246 | tips: ['احرصي على مراجعة الطبيبة أسبوعياً لمتابعة نبض الجنين وعنق الرحم.', 'تجنبي المجهود الزائد.'] |
| app/maternity/baby-development.tsx | 251 | milestones: ['اكتمال الحمل سريرياً (Full Term Baby)', 'جاهزية الرئتين والجهاز الهضمي للعمل المستقل خارج الرحم'], |
| app/maternity/baby-development.tsx | 252 | tips: ['المشي اليومي الخفيف يساعد على فتح الحوض وتسهيل الولادة.', 'تناولي التمر لفوائده لعضلات الرحم.'] |
| app/maternity/baby-development.tsx | 257 | milestones: ['تساقط كافة الشعر الناعم والطلاء الدهني في السائل الأمنيوسي', 'تكون قبضة يد قوية جداً للجنين وتطور منعكس المص'], |
| app/maternity/baby-development.tsx | 258 | tips: ['استرخي وخذي حماماً دافئاً لتخفيف آلام الظهر وتشنجات الحوض.', 'حافظي على ترطيب بشرتك.'] |
| app/maternity/baby-development.tsx | 263 | milestones: ['اكتمال بناء الأجهزة واستقرار الوزن النهائي للجنين', 'تراكم الأجسام المضادة للأم لضمان مناعة قوية للرضيع'], |
| app/maternity/baby-development.tsx | 264 | tips: ['كوني على تواصل مستمر مع طبيبتك ومستشفى الولادة.', 'راقبي نزول أي سوائل أو إفرازات غريبة.'] |
| app/maternity/baby-development.tsx | 269 | milestones: ['جاهزية الجنين الكاملة للخروج والولادة الطبيعية', 'بلوغ الوزن والطول المتوسط المثالي لحديثي الولادة'], |
| app/maternity/baby-development.tsx | 270 | tips: ['تمنياتنا لك بولادة ميسرة وطفل سليم! استرخي وامشي بانتظام.', 'اتبعي كافة إرشادات فريقك الطبي بالمستشفى.'] |
| app/maternity/baby-development.tsx | 411 | const arabicNums = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩']; |
| app/maternity/baby-growth.tsx | 27 | const arabicNums = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩']; |
| app/maternity/hub.tsx | 33 | const arabicNums = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩']; |
| app/maternity/hub.tsx | 248 | const trimesterText = week <= 12 ? 'الثلث الأول' : week <= 26 ? 'الثلث الثاني' : 'الثلث الثالث'; |
| app/maternity/hub.tsx | 442 | const isCurrent = c.week === `${week} أسبوع`; |
| app/maternity/maternity-setup.tsx | 17 | const arabicNums = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩']; |
| app/maternity/maternity-setup.tsx | 32 | const daysOfWeek = ['س', 'ح', 'ن', 'ث', 'ر', 'خ', 'ج']; |
| app/maternity/ovulation-tracker.tsx | 18 | const arabicNums = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩']; |
| app/maternity/ovulation-tracker.tsx | 32 | const daysOfWeek = ['س', 'ح', 'ن', 'ث', 'ر', 'خ', 'ج']; |
| app/maternity/pregnancy-tracker.tsx | 202 | <SectionHeader title="حساب ركلات الجنين" /> |
| app/maternity/pregnancy-tracker.tsx | 247 | <SectionHeader title="مؤقت الانقباضات (الطلق)" /> |
| app/maternity/pregnancy-tracker.tsx | 278 | <SectionHeader title="الفحوصات القادمة" /> |
| app/mental-health/meditation.tsx | 176 | {[{ num: '12', label: 'جلسة هذا الشهر' }, { num: '3.5h', label: 'وقت التأمل' }, { num: '5', label: 'يوم متتالٍ' }].map((s, i) => ( |
| app/mental-health/meditation.tsx | 193 | <View style={[styles.levelBadge, { backgroundColor: session.level === 'مبتدئ' ? (isDark ? 'rgba(91,168,79,0.15)' : '#DCFCE7') : session.level === 'متوسط' ? (isDark ? 'rgba(240,165,38,0.15)' : '#FEF3C7') : (isDark ? 'rgba(122,107,234,0.15)' : '#EDE9FE') } ]}> |
| app/mental-health/mood-journal.tsx | 28 | const EMOTIONS = ['سعيد', 'هادئ', 'متحمس', 'ممتن', 'متعب', 'قلق', 'محبط', 'وحيد', 'غاضب', 'متوتر', 'مرتاح', 'خائف']; |
| app/mental-health/mood-journal.tsx | 29 | const ACTIVITIES = ['تمرين رياضي', 'تأمل', 'قراءة ', 'مع العائلة ‍‍', 'عمل ', 'نوم جيد ', 'طعام صحي ', 'طبيعة ']; |
| app/mental-health/therapist-match.tsx | 12 | const CONCERNS = ['قلق وتوتر', 'اكتئاب', 'مشاكل نوم', 'ضغوط العمل', 'مشاكل عائلية', 'إدمان', 'صدمة نفسية', 'ثقة بالنفس', 'اضطرابات أكل', 'حزن وفقدان']; |
| app/mental-health/therapist-match.tsx | 41 | langs: d.languages?.map((l: string) => l === 'ar' ? 'العربية' : 'English') \|\| ['العربية'] |
| app/mental-health/therapist-match.tsx | 71 | <SectionHeader title="ما الذي يشغلك؟ (اختر كل ما ينطبق)" /> |
| app/nursing/nurse-profile.tsx | 53 | const [gpsLocation, setGpsLocation] = useState('حي الملقا، الرياض'); |
| app/nursing/nurse-profile.tsx | 58 | const dayNames = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']; |
| app/nursing/nurse-profile.tsx | 72 | const timesArray = ['08:00 ص', '08:30 ص', '09:00 ص', '09:30 ص', '10:00 ص', '10:30 ص', '11:00 ص', '11:30 ص', '12:00 م', '12:30 م', '01:00 م']; |
| app/nursing/service-details.tsx | 63 | const sortLabel = currentSort === 'nearest' ? 'الأقرب أولاً' : (currentSort === 'highest_rated' ? 'الأعلى تقييماً' : 'الكل'); |
| app/nutrition/ai-meal-planner.tsx | 36 | const [selectedDay, setSelectedDay] = useState('السبت'); |
| app/nutrition/ai-meal-planner.tsx | 61 | {['تحليل المؤشرات الصحية', 'حساب الاحتياجات الغذائية', 'اختيار الوجبات المناسبة', 'توازن المغذيات الكبرى'].map((s, i) => ( |
| app/nutrition/ai-meal-planner.tsx | 111 | {Object.keys(weeklyPlan).concat(['السبت', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة']).map(day => ( |
| app/nutrition/ai-plan-builder.tsx | 27 | const DIETS = ['عادي', 'نباتي', 'كيتو', 'منخفض الكربوهيدرات', 'خالي من الجلوتين', 'حلال فقط']; |
| app/nutrition/ai-plan-builder.tsx | 37 | const [diet, setDiet] = useState('عادي'); |
| app/nutrition/ai-plan-builder.tsx | 102 | <SectionHeader title="اختر هدفك" /> |
| app/nutrition/ai-plan-builder.tsx | 118 | <SectionHeader title="بيانات الجسم" /> |
| app/nutrition/ai-plan-builder.tsx | 119 | <SegmentedControl value={gender} onChange={setGender} options={[{ key: 'male', label: 'ذكر' }, { key: 'female', label: 'أنثى' }]} /> |
| app/nutrition/ai-plan-builder.tsx | 129 | <SectionHeader title="مستوى النشاط" /> |
| app/nutrition/ai-plan-builder.tsx | 141 | <SectionHeader title="تفضيلات غذائية" /> |
| app/nutrition/ai-plan-builder.tsx | 168 | <SectionHeader title="الهدف اليومي" /> |
| app/nutrition/body-composition.tsx | 147 | label="تحديد هدف جديد" |
| app/nutrition/body-composition.tsx | 153 | label="إنشاء خطة مخصصة" |
| app/nutrition/body-target.tsx | 30 | const bmiStatus = bmiNum < 18.5 ? 'نحيف' : bmiNum < 25 ? 'طبيعي' : bmiNum < 30 ? 'زيادة وزن' : 'سمنة'; |
| app/nutrition/body-target.tsx | 74 | <SegmentedControl value={gender} onChange={setGender} options={[{ key: 'male', label: 'ذكر' }, { key: 'female', label: 'أنثى' }]} /> |
| app/nutrition/body-target.tsx | 89 | {[{ l: 'نحيف', c: '#F0A526' }, { l: 'طبيعي', c: '#16A34A' }, { l: 'زيادة', c: '#F0A526' }, { l: 'سمنة', c: '#F0695C' }].map((s, i) => ( |
| app/nutrition/body-target.tsx | 97 | <SectionHeader title="الوزن المستهدف" /> |
| app/nutrition/calorie-analyzer.tsx | 118 | label="تحليل بالنص" |
| app/nutrition/calorie-analyzer.tsx | 127 | label="صوّر الأكل" |
| app/nutrition/calorie-analyzer.tsx | 162 | <SectionHeader title="القيم الغذائية" /> |
| app/nutrition/calorie-analyzer.tsx | 186 | <SectionHeader title="الفيتامينات والمعادن" /> |
| app/nutrition/calorie-analyzer.tsx | 202 | <SectionHeader title="نصائح AI" /> |
| app/nutrition/calorie-analyzer.tsx | 225 | label="إضافة للسجل اليومي" |
| app/nutrition/daily-tracker.tsx | 102 | <SectionHeader title="الوجبات" /> |
| app/nutrition/daily-tracker.tsx | 129 | <SectionHeader title="الماء" /> |
| app/nutrition/daily-tracker.tsx | 145 | {[{ label: 'كوب (250)', ml: 250 }, { label: 'قنينة (500)', ml: 500 }].map(s => ( |
| app/nutrition/food-scanner.tsx | 58 | suggestion: res.suggestions?.[0] \|\| 'وجبة مغذية غنية بالبروتينات والعناصر الهامة.', |
| app/nutrition/water-tracker.tsx | 156 | {['ابدأ يومك بكوب ماء فور الاستيقاظ', 'اشرب كوباً قبل كل وجبة', 'احمل قنينة ماء معك دائماً'].map((tip, i) => ( |
| app/offers/[id].tsx | 156 | <SectionHeader title="مشتملات الباقة" /> |
| app/offers/[id].tsx | 186 | <SectionHeader title="الشروط والأحكام" /> |
| app/payments/failure.tsx | 63 | label="إعادة المحاولة" |
| app/payments/failure.tsx | 69 | label="تغيير طريقة الدفع" |
| app/payments/failure.tsx | 75 | label="العودة للرئيسية" |
| app/payments/processing.tsx | 38 | const [statusText, setStatusText] = useState('جاري معالجة الدفع...'); |
| app/payments/processing.tsx | 377 | label="تحقق من حالة الدفع" |
| app/payments/processing.tsx | 384 | label="إلغاء العملية" |
| app/payments/success.tsx | 28 | const serviceName = params.serviceName as string \|\| 'الخدمة'; |
| app/pharmacy/chat-with-pharmacist.tsx | 296 | label="العودة للصيدلية" |
| app/pharmacy/drug-not-found.tsx | 96 | <SectionHeader title="بيانات الدواء" /> |
| app/pharmacy/drug-not-found.tsx | 110 | <SectionHeader title="صورة الدواء أو العلبة (اختياري)" /> |
| app/pharmacy/drug-not-found.tsx | 130 | <SectionHeader title="ماذا سيحدث؟" /> |
| app/pharmacy/filters.tsx | 86 | setCategoriesData([{ id: 'all', label: 'الكل', icon: 'apps', color: '#23B5CE' }, ...mapped]); |
| app/pharmacy/filters.tsx | 176 | <SectionTitle title="ترتيب حسب" /> |
| app/pharmacy/filters.tsx | 199 | <SectionTitle title="التصنيف" /> |
| app/pharmacy/filters.tsx | 250 | <SectionTitle title="نطاق السعر (ر.س)" /> |
| app/pharmacy/filters.tsx | 276 | <SectionTitle title="الشكل الدوائي" /> |
| app/pharmacy/filters.tsx | 299 | <SectionTitle title="الشركة المصنعة" /> |
| app/pharmacy/medicine-compare.tsx | 89 | const val = m[mappedKey as keyof typeof m] \|\| m[row.key as keyof typeof m] \|\| 'غير متوفر'; |
| app/pharmacy/order-tracking.tsx | 88 | const pharmacyName = orderData?.pharmacy_name ?? 'غير متاح'; |
| app/pharmacy/order-tracking.tsx | 89 | const estimatedTime = orderData?.estimated_arrival ?? 'غير متاح'; |
| app/pharmacy/pharmacist-chat.tsx | 74 | const newMsg = { id: Date.now(), sender: "me", text: msg, time: "الآن", status: isConnected ? "sent" : "pending" }; |
| app/pharmacy/product-detail.tsx | 135 | [{ text: isRTL ? 'موافق' : 'OK' }] |
| app/pharmacy/product-detail.tsx | 175 | const seoTitle = `${name} \| ${med.active_ingredient \|\| ''} \| صيدلية نبض`; |
| app/pharmacy/product-detail.tsx | 260 | {med.form && <InfoPill icon="category" pillTitle={isRTL ? "النوع" : "Form"} label={med.form} colors={colors} tint="#7A6BEA" bg={isDark ? '#2D2A4A' : '#EBE8FC'} isRTL={isRTL} />} |
| app/pharmacy/product-detail.tsx | 261 | {med.strength && <InfoPill icon="scale" pillTitle={isRTL ? "التركيز" : "Strength"} label={med.strength} colors={colors} tint="#F0A526" bg={isDark ? '#4A3515' : '#FEF6E8'} isRTL={isRTL} />} |
| app/pharmacy/product-detail.tsx | 262 | {med.active_ingredient && <InfoPill icon="science" pillTitle={isRTL ? "المادة الفعالة" : "Active Ingredient"} label={med.active_ingredient} colors={colors} tint="#2BB89C" bg={isDark ? '#153A33' : '#E8F8F5'} isRTL={isRTL} />} |
| app/pharmacy/product-detail.tsx | 291 | <DetailAccordion title={isRTL ? "الوصف والتفاصيل" : "Description"} icon="info" content={description \|\| med.d} colors={colors} isRTL={isRTL} defaultOpen={true} /> |
| app/pharmacy/product-detail.tsx | 292 | <DetailAccordion title={isRTL ? "الجرعة وطريقة الاستخدام" : "Dosage & Usage"} icon="medication" content={dosage} colors={colors} isRTL={isRTL} /> |
| app/pharmacy/product-detail.tsx | 293 | <DetailAccordion title={isRTL ? "الأعراض الجانبية" : "Side Effects"} icon="sick" content={sideEffects} colors={colors} isRTL={isRTL} /> |
| app/pharmacy/product-detail.tsx | 294 | <DetailAccordion title={isRTL ? "تحذيرات وموانع الاستخدام" : "Warnings & Precautions"} icon="warning" content={warnings} colors={colors} isRTL={isRTL} isWarning={true} /> |
| app/pharmacy/reorder.tsx | 127 | <SectionHeader title="طريقة الاستلام" /> |
| app/pharmacy/reorder.tsx | 139 | <SectionHeader title="طريقة الدفع" /> |
| app/pharmacy/rx-order.tsx | 89 | <SectionHeader title="الأدوية الموصوفة" /> |
| app/pharmacy/rx-order.tsx | 114 | <SectionHeader title="المستندات المطلوبة للتأمين" /> |
| app/pharmacy/rx-order.tsx | 151 | <SectionHeader title="طريقة الاستلام" /> |
| app/pharmacy/rx-order.tsx | 175 | <SectionHeader title="طريقة الدفع" /> |
| app/pharmacy/rx-order.tsx | 185 | <SectionHeader title="بيانات التأمين" /> |
| app/pharmacy/rx-order.tsx | 207 | <SectionHeader title="ملخص التكلفة" /> |
| app/pharmacy/rx-order.tsx | 221 | label={payMethod === 'insurance' ? 'التحقق من التأمين وطلب الأدوية' : `تأكيد ودفع ${total} ر.س`} |
| app/profile/addresses.tsx | 145 | label="إضافة عنوان جديد" |
| app/profile/index.tsx | 40 | const userName = user?.full_name \|\| user?.name \|\| 'الحساب غير مكتمل'; |
| app/profile/insurance.tsx | 133 | label="تحديث الوثيقة" |
| app/profile/insurance.tsx | 154 | label="إضافة بطاقة تأمين" |
| app/programs/active.tsx | 174 | <SectionHeader title="جدول الجلسات والزيارات" /> |
| app/reports/ai-analysis.tsx | 204 | label={f.type === "warning" ? "يحتاج متابعة" : "ممتاز"} |
| app/reports/ai-analysis.tsx | 252 | <SectionHeader title="الخطوات القادمة" /> |
| app/reports/ai-analysis.tsx | 287 | label="استشارة طبيب حول النتائج" |
| app/reports/ai-analysis.tsx | 293 | label="طلب أدوية مقترحة" |
| app/reports/hub.tsx | 104 | label="الكل" |
| app/reports/hub.tsx | 109 | label="تحاليل" |
| app/reports/hub.tsx | 115 | label="أشعة" |
| app/reports/hub.tsx | 171 | label={`${r.abnormal} يحتاج متابعة`} |
| app/reports/hub.tsx | 183 | label="عرض التفاصيل" |
| app/reports/hub.tsx | 195 | label="تحليل AI" |
| app/reports/passport.tsx | 43 | const name = profile.full_name \|\| 'مريض'; |
| app/reports/passport.tsx | 44 | const bloodType = profile.blood_type \|\| 'غير محدد'; |
| app/reports/passport.tsx | 45 | const allergies = (profile.allergies \|\| []).map((a: any) => a.name).join(', ') \|\| 'لا يوجد'; |
| app/reports/passport.tsx | 112 | label={passport?.verificationToken ? "رمز تحقق موقّع من المنصة" : "رمز التحقق غير متاح"} |
| app/reports/timeline.tsx | 105 | ["all", "الكل"], |
| app/reports/timeline.tsx | 106 | ["appointment", "استشارات"], |
| app/reports/timeline.tsx | 107 | ["lab", "تحاليل"], |
| app/reports/timeline.tsx | 108 | ["prescription", "وصفات"], |
| app/reports/timeline.tsx | 109 | ["vitals", "مؤشرات"], |
| app/reports/view-report.tsx | 291 | label="تحميل PDF" |
| app/reports/view-report.tsx | 300 | label="تحليل AI" |
| app/returns/detail.tsx | 108 | desc: `استرداد القيمة إلى: ${REFUND_LABELS[data?.refund_method as keyof typeof REFUND_LABELS] \|\| "المحفظة"}`, |
| app/returns/detail.tsx | 156 | v: TYPE_LABELS[data?.service_type] \|\| "غير معروف", |
| app/returns/detail.tsx | 163 | v: REFUND_LABELS[data?.refund_method] \|\| "محفظة نبض", |
| app/returns/hub.tsx | 194 | ["all", "الكل"], |
| app/returns/hub.tsx | 195 | ["processing", "قيد المراجعة"], |
| app/returns/hub.tsx | 196 | ["approved", "موافق"], |
| app/returns/hub.tsx | 197 | ["completed", "مكتمل"], |
| app/returns/hub.tsx | 198 | ["rejected", "مرفوض"], |
| app/returns/new-request.tsx | 30 | pharmacy: ['دواء تالف أو منتهي الصلاحية', 'خطأ في الطلب', 'دواء خاطئ', 'لم يصل الطلب', 'كميات ناقصة', 'سبب آخر'], |
| app/returns/new-request.tsx | 31 | consultation: ['إلغاء الموعد', 'الطبيب لم يحضر', 'جودة الاستشارة', 'مشكلة تقنية', 'سبب آخر'], |
| app/returns/new-request.tsx | 32 | diagnostics: ['تكرار الطلب', 'إلغاء التحليل', 'خطأ في النتائج', 'لم يتم السحب', 'سبب آخر'], |
| app/returns/new-request.tsx | 33 | nursing: ['الممرض لم يحضر', 'تأخر عن الموعد', 'جودة الخدمة', 'إلغاء الطلب', 'سبب آخر'], |
| app/returns/new-request.tsx | 34 | insurance: ['دفع زائد', 'خطأ في الحساب', 'خدمة غير مغطاة', 'سبب آخر'], |
| app/returns/new-request.tsx | 83 | Alert.alert('خطأ', 'فشل تقديم طلب الإرجاع. الرجاء المحاولة مرة أخرى.'); |
| app/returns/new-request.tsx | 214 | <TouchableOpacity onPress={() => setAttachedDocs(p => [...p, `صورة ${p.length + 1}`])} |
| app/reviews/index.tsx | 103 | ["", "سيء", "مقبول", "جيد", "ممتاز", "رائع جداً!"][ |
| app/search/index.tsx | 17 | const cats = ['الكل', 'أطباء', 'صيدلية', 'تحاليل', 'مقالات']; |
| app/search/index.tsx | 20 | const catMap = { 'أطباء': 'دكتور', 'صيدلية': 'دواء', 'تحاليل': 'تحليل', 'مقالات': 'مقال' }; |
| app/settings/feedback.tsx | 50 | const TYPES = ["اقتراح", "مشكلة", "شكوى", "إطراء", "استفسار"]; |
| app/settings/index.tsx | 45 | [{ icon: "logout", label: "تسجيل الخروج", danger: true }], |
| app/settings/index.tsx | 54 | if (item.label === "اللغة") { |
| app/settings/index.tsx | 58 | if (item.label === "تسجيل الخروج") { |
| app/settings/index.tsx | 106 | ) : item.label === "اللغة" ? ( |
| app/shared/location-picker.tsx | 147 | const addr = [g.street, g.district, g.city].filter(Boolean).join("، "); |
| app/shared/location-picker.tsx | 370 | name={addr.label === "العمل" ? "hospital" : "home"} |
| app/wallet/cards.tsx | 91 | [{ text: "حسناً" }], |
| app/wallet/cards.tsx | 338 | label="إضافة بطاقة جديدة" |
| app/wallet/topup.tsx | 41 | Alert.alert("خطأ", "يرجى إدخال مبلغ صحيح"); |
| app/wallet/topup.tsx | 55 | Alert.alert("خطأ", "تعذر إتمام عملية الشحن"); |
| app/wallet/topup.tsx | 105 | <SectionHeader title="الخيارات" /> |
| app/wallet/transactions.tsx | 20 | const FILTERS = ["الكل", "خصم", "إيداع", "تحويل", "شحن"]; |
| app/wallet/transactions.tsx | 32 | const [filter, setFilter] = useState("الكل"); |
| app/wallet/transfer.tsx | 40 | Alert.alert("خطأ", "يرجى إدخال معرف مستلم صحيح"); |
| app/wallet/transfer.tsx | 53 | Alert.alert("خطأ", "يرجى إدخال مبلغ صحيح"); |
| app/wallet/transfer.tsx | 57 | Alert.alert("خطأ", "رصيدك الحالي غير كافٍ"); |
| app/wallet/transfer.tsx | 128 | <SectionHeader title="الخيارات" /> |
| app/wearables/hub.tsx | 55 | <SectionHeader title="الأجهزة المتوفرة للربط" /> |
| app/wearables/hub.tsx | 141 | label={syncing ? "جاري المزامنة..." : "مزامنة القراءات الآن"} |
| src/components/Header.tsx | 43 | const getLangLabel = () => LANGUAGES.find((language) => language.code === lang)?.native ?? 'العربية'; |
| src/components/livekit-view.tsx | 144 | label={isMuted ? 'تفعيل الصوت' : 'كتم'} |
| src/components/livekit-view.tsx | 151 | label={isCameraOff ? 'تشغيل الكاميرا' : 'إيقاف الكاميرا'} |
| src/components/livekit-view.tsx | 158 | label={isSpeaker ? 'سماعة الهاتف' : 'مكبر الصوت'} |
| src/constants/index.ts | 1 | export const APP_NAME = 'نبض بلس'; |
| src/design-system/components/States.tsx | 183 | label="أعد المحاولة" |
| src/design-system/components/States.tsx | 193 | label="العودة" |
| src/services/ErrorHandler.tsx | 161 | label="أعد المحاولة" |
