# جرد النصوص العربية المرشحة لتوطين يدوي إضافي — تطبيق المريض

**النطاق:** ملفات TS/TSX تحت `app/` و`src/`، مع استبعاد مجلد i18n والأصول.
**الغرض:** هذا الفحص لا يحكم بأن كل سطر عطل؛ بل يرصد النص العربي الظاهر في مكوّنات أو خصائص لا يثبت الفحص الساكن أنها تمر عبر `AppText`/`autoTranslate`.
**النتيجة:** **1073** سطراً مرشحاً في **181** ملفاً.

> لا تعني تغطية القاموس المولّد وحدها أن كل نص مرئي سيعرض بلغة المستخدم؛ هذه القائمة هي قائمة عمل للفصل بين النصوص الدلالية، وأسماء العلامات، ورسائل الحالة، وخصائص الإدخال، والواجهات التي تحتاج مفاتيح i18n صريحة.

| الملف | السطر | المقتطف |
|---|---:|---|
| app/(auth)/forgot-password.tsx | 44 | Alert.alert("خطأ", err.message \|\| "فشل إرسال رمز التحقق"); |
| app/(auth)/forgot-password.tsx | 106 | placeholder="البريد الإلكتروني" |
| app/(auth)/forgot-password.tsx | 112 | label="إرسال رمز التحقق" |
| app/(auth)/forgot-password.tsx | 120 | label="العودة لتسجيل الدخول" |
| app/(auth)/login.tsx | 233 | <Text style={[styles.inputLabel, { color: resolveColor('var(--t3)', isDark), textAlign: isRTL ? 'right' : 'left' } ]}>البريد الإلكتروني</Text> |
| app/(auth)/login.tsx | 253 | <Text style={[styles.inputLabel, { color: resolveColor('var(--t3)', isDark), textAlign: isRTL ? 'right' : 'left' } ]}>كلمة المرور</Text> |
| app/(auth)/login.tsx | 296 | <Text style={styles.primaryBtnText}>{loading ? 'جاري التحقق...' : 'تسجيل الدخول'}</Text> |
| app/(auth)/login.tsx | 305 | <Text style={[styles.secondaryBtnText, { color: resolveColor('var(--p)', isDark) } ]}>الدخول برمز التحقق (OTP)</Text> |
| app/(auth)/login.tsx | 310 | <Text style={{ fontSize: 10, color: resolveColor('var(--t3)', isDark), marginHorizontal: 12, fontWeight: '800' }}>أو الدخول بواسطة</Text> |
| app/(auth)/login.tsx | 340 | <Text style={{ fontSize: 13, color: resolveColor('var(--t2)', isDark), fontWeight: '700' }}>ليس لديك حساب؟ </Text> |
| app/(auth)/login.tsx | 342 | <Text style={{ fontSize: 13, color: resolveColor('var(--p)', isDark), fontWeight: '800' }}>سجل الآن</Text> |
| app/(auth)/otp.tsx | 60 | Alert.alert('خطأ', 'الرجاء إدخال الرمز المكون من 6 أرقام كاملاً'); |
| app/(auth)/otp.tsx | 116 | Alert.alert('خطأ', 'رمز غير صحيح أو الحساب غير موجود'); |
| app/(auth)/otp.tsx | 135 | Alert.alert('خطأ', err.message \|\| 'رمز التحقق غير صحيح'); |
| app/(auth)/otp.tsx | 152 | <Text style={[styles.title, { textAlign: isRTL ? 'right' : 'left', color: resolveColor('var(--n)', isDark) } ]}>رمز التحقق</Text> |
| app/(auth)/otp.tsx | 153 | <Text style={[styles.subtitle, { textAlign: isRTL ? 'right' : 'left', color: resolveColor('var(--t2)', isDark) } ]}>أدخل الرمز المكون من 6 أرقام المرسل إلى {params.email \|\| phone}</Text> |
| app/(auth)/otp.tsx | 190 | <Text style={[styles.timerText, { color: resolveColor('var(--p)', isDark) } ]}>إعادة إرسال الرمز</Text> |
| app/(auth)/otp.tsx | 201 | <Text style={styles.primaryBtnText}>{loading ? 'جاري التحقق...' : 'تأكيد الرمز'}</Text> |
| app/(auth)/provider-info.tsx | 59 | label="الاستمرار كمريض" |
| app/(auth)/register.tsx | 213 | <Text style={[styles.title, { color: resolveColor('var(--n)', isDark), textAlign: isRTL ? 'right' : 'left' } ]}>إنشاء حساب</Text> |
| app/(auth)/register.tsx | 214 | <Text style={[styles.subtitle, { color: resolveColor('var(--t2)', isDark), textAlign: isRTL ? 'right' : 'left' } ]}>انضم لنبض بلس وابدأ رحلتك الصحية</Text> |
| app/(auth)/register.tsx | 217 | label={'الاسم الكامل'} |
| app/(auth)/register.tsx | 219 | placeholder={'أدخل اسمك الكامل'} |
| app/(auth)/register.tsx | 226 | label={'رقم الهاتف'} |
| app/(auth)/register.tsx | 235 | label={'البريد الإلكتروني'} |
| app/(auth)/register.tsx | 244 | label={'كلمة المرور'} |
| app/(auth)/register.tsx | 254 | label={'تأكيد كلمة المرور'} |
| app/(auth)/register.tsx | 270 | أوافق على <Text onPress={() => router.push('/(auth)/terms')} style={{ color: resolveColor('var(--p)', isDark), fontWeight: '800' }}>الشروط والأحكام</Text> و<Text onPress={() => router.push('/(auth)/privacy')} style={{ color: resolveColor('var(--p)', isDark), fontWeight: '800' }}>سياسة الخصوصية</Text> |
| app/(auth)/register.tsx | 286 | <Text style={styles.primaryBtnText}>{loading ? 'جاري الإرسال...' : 'إنشاء الحساب'}</Text> |
| app/(auth)/register.tsx | 291 | <Text style={{ fontSize: 10, color: resolveColor('var(--t3)', isDark), marginHorizontal: 12, fontWeight: '800' }}>أو التسجيل بواسطة</Text> |
| app/(auth)/register.tsx | 320 | <Text style={{ fontSize: 13, color: resolveColor('var(--t2)', isDark), fontWeight: '700' }}>لديك حساب بالفعل؟ </Text> |
| app/(auth)/register.tsx | 322 | <Text style={{ fontSize: 13, color: resolveColor('var(--p)', isDark), fontWeight: '800' }}>تسجيل الدخول</Text> |
| app/(auth)/reset-password.tsx | 43 | Alert.alert("خطأ", err.message \|\| "فشل حفظ كلمة المرور الجديدة"); |
| app/(auth)/reset-password.tsx | 73 | label="تسجيل الدخول" |
| app/(auth)/reset-password.tsx | 115 | placeholder="كلمة المرور الجديدة" |
| app/(auth)/reset-password.tsx | 125 | placeholder="تأكيد كلمة المرور" |
| app/(auth)/reset-password.tsx | 132 | label="حفظ كلمة المرور" |
| app/(auth)/welcome.tsx | 133 | <Text style={[styles.title, { color: resolveColor('var(--n)') } ]}>{lang === 'ar' ? 'نبض بلس' : 'Nabd Plus'}</Text> |
| app/(auth)/welcome.tsx | 146 | <Text style={[styles.primaryBtnText, { color: '#fff' } ]}>{lang === 'ar' ? 'الاستمرار بدون تسجيل' : 'Continue as Guest'}</Text> |
| app/(auth)/welcome.tsx | 154 | <Text style={styles.primaryBtnText}>{lang === 'ar' ? 'تسجيل' : 'Register'}</Text> |
| app/(auth)/welcome.tsx | 162 | <Text style={[styles.secondaryBtnText, { color: resolveColor('var(--n)') } ]}>{lang === 'ar' ? 'تسجيل دخول' : 'Log In'}</Text> |
| app/(onboarding)/language.tsx | 58 | <Button label="متابعة" variant="gradient" size="lg" iconRight="chevronLeft" onPress={() => { setLang(selected); router.replace('/(auth)/welcome'); }} /> |
| app/(onboarding)/permissions.tsx | 169 | label="متابعة" |
| app/(tabs)/consultations/index.tsx | 26 | const [activePay, setActivePay] = useState('الكل'); |
| app/(tabs)/consultations/index.tsx | 28 | const [activeSpec, setActiveSpec] = useState('الكل'); |
| app/(tabs)/consultations/index.tsx | 33 | const [filterTitle, setFilterTitle] = useState('الكل'); |
| app/(tabs)/consultations/index.tsx | 34 | const [filterGender, setFilterGender] = useState('الكل'); |
| app/(tabs)/consultations/index.tsx | 35 | const [filterPrice, setFilterPrice] = useState('الكل'); |
| app/(tabs)/consultations/index.tsx | 36 | const [filterAvail, setFilterAvail] = useState('الكل'); |
| app/(tabs)/consultations/index.tsx | 37 | const [filterSort, setFilterSort] = useState('الأعلى تقييماً'); |
| app/(tabs)/consultations/index.tsx | 39 | const [insCompany, setInsCompany] = useState('الكل'); |
| app/(tabs)/consultations/index.tsx | 40 | const [insClass, setInsClass] = useState('الكل'); |
| app/(tabs)/consultations/index.tsx | 44 | 'الكل': ['الكل'], |
| app/(tabs)/consultations/index.tsx | 45 | 'بوبا العربية (Bupa)': ['VIP', 'شبكة 1', 'شبكة 2', 'شبكة 3', 'شبكة 4', 'شبكة 5', 'شبكة 6', 'شبكة 7', 'شبكة 8'], |
| app/(tabs)/consultations/index.tsx | 46 | 'التعاونية (Tawuniya)': ['الماسية', 'البلاتينية', 'الذهبية', 'الفضية', 'البرونزية', 'الأساسية', 'عائلتي'], |
| app/(tabs)/consultations/index.tsx | 47 | 'تكافل الراجحي': ['الفئة 1', 'الفئة 2', 'الفئة 3', 'الفئة 4', 'الفئة 5', 'الفئة 6', 'الفئة 7'], |
| app/(tabs)/consultations/index.tsx | 48 | 'ميدغلف (Medgulf)': ['الفئة A', 'الفئة B', 'الفئة C', 'الفئة D'], |
| app/(tabs)/consultations/index.tsx | 50 | 'جي آي جي (GIG)': ['شبكة 1', 'شبكة 2', 'شبكة 3', 'شبكة 4', 'شبكة 5'], |
| app/(tabs)/consultations/index.tsx | 51 | 'ملاذ للتأمين': ['شبكة مميزة', 'شبكة عامة'], |
| app/(tabs)/consultations/index.tsx | 54 | 'الدرع العربي': ['الماسية', 'الذهبية', 'الفضية'], |
| app/(tabs)/consultations/index.tsx | 60 | 'أليانز السعودي الفرنسي': ['الماسية', 'الذهبية', 'الفضية'], |
| app/(tabs)/consultations/index.tsx | 112 | let isInsured = (d.insurance_supported && d.insurance_supported.length > 0) \|\| (d.tags && d.tags.includes('تأمين')); |
| app/(tabs)/consultations/index.tsx | 133 | let matchesTitle = filterTitle === 'الكل' \|\| (d.sp \|\| d.badge \|\| d.biography \|\| '').includes(filterTitle); |
| app/(tabs)/consultations/index.tsx | 174 | placeholder="ابحث عن دكتور أو تخصص..." |
| app/(tabs)/consultations/index.tsx | 204 | <TouchableOpacity style={[styles.segmentBtn, activePay === 'الكل' && { backgroundColor: resolveColor('var(--n)') }]} onPress={() => setActivePay('الكل')}> |
| app/(tabs)/consultations/index.tsx | 205 | <Text style={[styles.segmentText, activePay === 'الكل' ? { color: '#fff' } : { color: colors.t2 }]} >الكل</Text> |
| app/(tabs)/consultations/index.tsx | 207 | <TouchableOpacity style={[styles.segmentBtn, activePay === 'كاش' && { backgroundColor: resolveColor('var(--n)') }]} onPress={() => setActivePay('كاش')}> |
| app/(tabs)/consultations/index.tsx | 208 | <Text style={[styles.segmentText, activePay === 'كاش' ? { color: '#fff' } : { color: colors.t2 }]} >كاش</Text> |
| app/(tabs)/consultations/index.tsx | 210 | <TouchableOpacity style={[styles.segmentBtn, activePay === 'تأمين' && { backgroundColor: resolveColor('var(--n)') }]} onPress={() => { setActivePay('تأمين'); setStepIns(1); setShowInsModal(true); }}> |
| app/(tabs)/consultations/index.tsx | 211 | <Text style={[styles.segmentText, activePay === 'تأمين' ? { color: '#fff' } : { color: colors.t2 }]} >تأمين</Text> |
| app/(tabs)/consultations/index.tsx | 217 | <Text style={{ fontSize: 15, fontWeight: '800', color: colors.n }}>التخصصات</Text> |
| app/(tabs)/consultations/index.tsx | 218 | <TouchableOpacity><Text style={{ fontSize: 12, fontWeight: '700', color: resolveColor('var(--pd)') }}>عرض الكل</Text></TouchableOpacity> |
| app/(tabs)/consultations/index.tsx | 236 | <Text style={{ fontSize: 15, fontWeight: '800', color: colors.n }}>أفضل الأطباء</Text> |
| app/(tabs)/consultations/index.tsx | 237 | <TouchableOpacity><Text style={{ fontSize: 12, fontWeight: '700', color: resolveColor('var(--pd)') }}>عرض الكل</Text></TouchableOpacity> |
| app/(tabs)/consultations/index.tsx | 270 | clinic: ['meeting_room', 'var(--bl)', 'var(--bs)', 'عيادة'], |
| app/(tabs)/consultations/index.tsx | 271 | home: ['home_health', 'var(--tl)', 'var(--ts)', 'منزلي'], |
| app/(tabs)/consultations/index.tsx | 272 | online: ['videocam', 'var(--pr)', 'var(--prs)', 'أونلاين'] |
| app/(tabs)/consultations/index.tsx | 308 | {doc.p}<Text style={{ fontSize: 9, opacity: 0.6 }}> ر.س</Text> |
| app/(tabs)/consultations/index.tsx | 311 | <Text style={{ fontSize: 11, fontWeight: '700', color: resolveColor('var(--pd)') }}>احجز</Text> |
| app/(tabs)/consultations/index.tsx | 321 | <Text style={{ fontSize: 15, fontWeight: '800', color: colors.n }}>عروض وباقات</Text> |
| app/(tabs)/consultations/index.tsx | 322 | <TouchableOpacity><Text style={{ fontSize: 12, fontWeight: '700', color: resolveColor('var(--pd)') }}>عرض الكل</Text></TouchableOpacity> |
| app/(tabs)/consultations/index.tsx | 333 | <Text style={{ fontSize: 9, color: colors.t3, marginRight: 2 }}>ر.س</Text> |
| app/(tabs)/consultations/index.tsx | 346 | <Text style={{ fontSize: 15, fontWeight: '800', color: colors.n }}>أطباء آخرون</Text> |
| app/(tabs)/consultations/index.tsx | 347 | <TouchableOpacity><Text style={{ fontSize: 12, fontWeight: '700', color: resolveColor('var(--pd)') }}>عرض الكل</Text></TouchableOpacity> |
| app/(tabs)/consultations/index.tsx | 380 | clinic: ['meeting_room', 'var(--bl)', 'var(--bs)', 'عيادة'], |
| app/(tabs)/consultations/index.tsx | 381 | home: ['home_health', 'var(--tl)', 'var(--ts)', 'منزلي'], |
| app/(tabs)/consultations/index.tsx | 382 | online: ['videocam', 'var(--pr)', 'var(--prs)', 'أونلاين'] |
| app/(tabs)/consultations/index.tsx | 418 | {doc.p}<Text style={{ fontSize: 9, opacity: 0.6 }}> ر.س</Text> |
| app/(tabs)/consultations/index.tsx | 421 | <Text style={{ fontSize: 11, fontWeight: '700', color: resolveColor('var(--pd)') }}>احجز</Text> |
| app/(tabs)/consultations/index.tsx | 434 | <Text style={{ fontSize: 13, fontWeight: '700', color: resolveColor('var(--pd)') }}>إعادة ضبط</Text> |
| app/(tabs)/consultations/index.tsx | 436 | <Text style={{ fontSize: 18, fontWeight: '900', color: colors.n }}>تصفية متقدمة</Text> |
| app/(tabs)/consultations/index.tsx | 443 | <Text style={{ fontSize: 14, fontWeight: '800', color: colors.n, marginBottom: 12, textAlign: 'left' }}>الترتيب حسب</Text> |
| app/(tabs)/consultations/index.tsx | 445 | {['الأعلى تقييماً', 'الأقل سعراً', 'الأقرب'].map(t => ( |
| app/(tabs)/consultations/index.tsx | 452 | <Text style={{ fontSize: 14, fontWeight: '800', color: colors.n, marginBottom: 12, textAlign: 'left' }}>اللقب المهني</Text> |
| app/(tabs)/consultations/index.tsx | 454 | {['الكل', 'أخصائي', 'استشاري'].map(t => ( |
| app/(tabs)/consultations/index.tsx | 461 | <Text style={{ fontSize: 14, fontWeight: '800', color: colors.n, marginBottom: 12, textAlign: 'left' }}>جنس الطبيب</Text> |
| app/(tabs)/consultations/index.tsx | 463 | {['الكل', 'طبيب', 'طبيبة'].map(g => ( |
| app/(tabs)/consultations/index.tsx | 470 | <Text style={{ fontSize: 14, fontWeight: '800', color: colors.n, marginBottom: 12, textAlign: 'left' }}>السعر</Text> |
| app/(tabs)/consultations/index.tsx | 472 | {['الكل', 'أقل من 100', '100 - 200', 'أكثر من 200'].map(p => ( |
| app/(tabs)/consultations/index.tsx | 479 | <Text style={{ fontSize: 14, fontWeight: '800', color: colors.n, marginBottom: 12, textAlign: 'left' }}>المواعيد المتاحة</Text> |
| app/(tabs)/consultations/index.tsx | 481 | {['الكل', 'اليوم', 'غداً'].map(a => ( |
| app/(tabs)/consultations/index.tsx | 489 | <Text style={{ color: '#fff', fontWeight: '900', fontSize: 16 }}>تطبيق الفلاتر</Text> |
| app/(tabs)/consultations/index.tsx | 574 | <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800' }}>{lang === 'ar' ? 'ابدأ الآن' : 'Start Now'}</Text> |
| app/(tabs)/diagnostics.tsx | 91 | placeholder={mainTab === 'labs' ? "ابحث عن تحليل، باقة، أو مختبر..." : "ابحث عن نوع الأشعة أو المركز..."} |
| app/(tabs)/health.tsx | 112 | v.label === "الماء اليوم" |
| app/(tabs)/health.tsx | 203 | title="مؤشراتك الحيوية" |
| app/(tabs)/health.tsx | 289 | title="مواعيدك القادمة" |
| app/(tabs)/health.tsx | 320 | <Badge label="فيديو" color={colors.primary} icon="video" /> |
| app/(tabs)/index.tsx | 16 | ['استشارات', 'stethoscope', 'var(--p)', 'var(--ps)', 's0'], |
| app/(tabs)/index.tsx | 17 | ['صيدلية', 'prescriptions', 'var(--pr)', 'var(--prs)', 's1'], |
| app/(tabs)/index.tsx | 18 | ['تحاليل', 'science', 'var(--tl)', 'var(--ts)', 's2'], |
| app/(tabs)/index.tsx | 19 | ['تمريض', 'home_health', 'var(--bl)', 'var(--bs)', 's3'], |
| app/(tabs)/index.tsx | 20 | ['التغذية', 'nutrition', 'var(--gr)', 'var(--grs)', 's139'], |
| app/(tabs)/index.tsx | 21 | ['الأمومة', 'pregnant_woman', 'var(--pk)', 'var(--pks)', 's154'], |
| app/(tabs)/index.tsx | 22 | ['الخريطة', 'pin_drop', 'var(--tl)', 'var(--ts)', 's116'], |
| app/(tabs)/index.tsx | 23 | ['صحتي', 'ecg_heart', 'var(--cr)', 'var(--cs)', 's4'], |
| app/(tabs)/index.tsx | 24 | ['إسعاف', 'emergency', 'var(--or)', 'var(--ors)', 's158'] |
| app/(tabs)/index.tsx | 28 | ['المساعد الطبي الذكي', 'robot', 'var(--p)', 's47'], |
| app/(tabs)/index.tsx | 29 | ['مترجم روشتات', 'translate', 'var(--pr)', 's135'], |
| app/(tabs)/index.tsx | 30 | ['تحليل البشرة', 'face-woman', 'var(--pk)', 's136'], |
| app/(tabs)/index.tsx | 31 | ['تقرير شهري', 'chart-line', 'var(--tl)', 's137'] |
| app/(tabs)/index.tsx | 148 | <Text style={{ fontSize: 11, color: colors.t3, marginBottom: 3, textAlign: isRTL ? 'right' : 'left' }}>{lang === 'ar' ? 'مساء الخير' : 'Good evening'}</Text> |
| app/(tabs)/index.tsx | 149 | <Text style={{ fontSize: 20, fontWeight: '800', color: colors.n, textAlign: isRTL ? 'right' : 'left' }}>{profile?.name \|\| (lang === 'ar' ? 'مستخدم نبض' : 'Nabdah user')}</Text> |
| app/(tabs)/index.tsx | 189 | <TouchableOpacity activeOpacity={0.8} style={[styles.healthBanner, { borderColor: resolveColor('var(--prs)') }]} onPress={() => go('s19', 'تذكير صحي')}> |
| app/(tabs)/index.tsx | 196 | <Text style={{ fontSize: 10, fontWeight: '700', color: resolveColor('var(--pr)'), marginBottom: 2, textAlign: 'left' }}>تذكير صحي</Text> |
| app/(tabs)/index.tsx | 197 | <Text style={{ fontSize: 14, fontWeight: '800', color: colors.n, textAlign: 'left' }}>حان وقت فحص السكر التراكمي</Text> |
| app/(tabs)/index.tsx | 198 | <Text style={{ fontSize: 11, color: colors.t3, marginTop: 4, textAlign: 'left' }}>مرّت ٣ شهور على آخر فحص HbA1c</Text> |
| app/(tabs)/index.tsx | 227 | <Text style={{ fontSize: 9, fontWeight: '800', color: '#C4B8FF' }}>مدعوم بالذكاء الاصطناعي</Text> |
| app/(tabs)/index.tsx | 229 | <Text style={{ fontSize: 16, fontWeight: '800', color: '#fff', textAlign: 'left' }}>المساعد الطبي الذكي</Text> |
| app/(tabs)/index.tsx | 230 | <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', marginTop: 4, textAlign: 'left' }}>حلّل أعراضك واعرف التخصص المناسب فوراً</Text> |
| app/(tabs)/index.tsx | 249 | <TouchableOpacity activeOpacity={0.7} style={[styles.allServices, { backgroundColor: colors.s, borderColor: colors.bd }]} onPress={() => go('s158', 'كل الخدمات')}> |
| app/(tabs)/index.tsx | 254 | <Text style={{ fontSize: 14, fontWeight: '800', color: colors.n, textAlign: 'left' }}>كل الخدمات</Text> |
| app/(tabs)/index.tsx | 255 | <Text style={{ fontSize: 11, color: colors.t3, textAlign: 'left', marginTop: 2 }}>تغذية، أمومة، مجتمع، تمريض، وأكثر</Text> |
| app/(tabs)/index.tsx | 262 | <Text style={{ fontSize: 15, fontWeight: '800', color: colors.n }}>موعدك القادم</Text> |
| app/(tabs)/index.tsx | 263 | <TouchableOpacity onPress={() => go('s22')}><Text style={{ fontSize: 12, fontWeight: '700', color: resolveColor('var(--pd)') }}>كل المواعيد</Text></TouchableOpacity> |
| app/(tabs)/index.tsx | 268 | <Text style={{ fontSize: 18, fontWeight: '900', color: '#fff' }}>{upcomingAppt.date?.split('-')[2] \|\| '٢٦'}</Text> |
| app/(tabs)/index.tsx | 269 | <Text style={{ fontSize: 10, fontWeight: '600', color: 'rgba(255,255,255,0.8)' }}>يونيو</Text> |
| app/(tabs)/index.tsx | 276 | <Text style={{ fontSize: 12, fontWeight: '800', color: colors.n }}>التفاصيل</Text> |
| app/(tabs)/index.tsx | 281 | <Text style={{ color: '#fff' }}>لا توجد مواعيد قادمة</Text> |
| app/(tabs)/index.tsx | 287 | <Text style={{ fontSize: 15, fontWeight: '800', color: colors.n }}>عروض وباقات</Text> |
| app/(tabs)/index.tsx | 288 | <TouchableOpacity onPress={() => go('s26')}><Text style={{ fontSize: 12, fontWeight: '700', color: resolveColor('var(--pd)') }}>عرض الكل</Text></TouchableOpacity> |
| app/(tabs)/index.tsx | 297 | {o.sponsored && <View style={[styles.offerSponsored, { backgroundColor: 'rgba(255,255,255,0.9)' } ]}><Text style={{ color: o.c, fontSize: 10, fontWeight: '800' }}>ممول</Text></View>} |
| app/(tabs)/index.tsx | 309 | <Text style={{ fontSize: 10, color: colors.t3, marginLeft: 4 }}>ر.س</Text> |
| app/(tabs)/nursing.tsx | 103 | placeholder="ابحث عن خدمة أو ممرض..." |
| app/(tabs)/nursing.tsx | 118 | <Text style={[styles.toggleText, paymentFlow === 'insurance' && styles.toggleTextActive]} >تأمين طبي</Text> |
| app/(tabs)/nursing.tsx | 126 | <Text style={[styles.toggleText, paymentFlow === 'cash' && styles.toggleTextActive]} >بدون تأمين / نقدي</Text> |
| app/(tabs)/nursing.tsx | 133 | <Text style={[styles.sectionTitle, { color: colors.textPrimary } ]}>باقات الرعاية المستمرة</Text> |
| app/(tabs)/nursing.tsx | 141 | <Text style={styles.packageDesc}>{pkg.type === 'monthly' ? 'باقة شهرية' : 'باقة أسبوعية'}</Text> |
| app/(tabs)/nursing.tsx | 150 | <Text style={[styles.sectionTitle, { color: colors.textPrimary } ]}>الرعاية الأساسية والمتقدمة</Text> |
| app/(tabs)/nursing.tsx | 176 | <Text style={styles.resetText}>إعادة ضبط</Text> |
| app/(tabs)/nursing.tsx | 178 | <Text style={[styles.modalTitle, { color: colors.textPrimary } ]}>خيارات التصفية</Text> |
| app/(tabs)/nursing.tsx | 181 | <Text style={[styles.filterLabel, { color: colors.textSecondary } ]}>الجنس</Text> |
| app/(tabs)/nursing.tsx | 183 | <TouchableOpacity onPress={() => setGender('any')} style={[gender === 'any' ? styles.filterOptionActive : styles.filterOption]} ><Text style={gender === 'any' ? styles.filterOptionTextActive : styles.filterOptionText}>الكل</Text></TouchableOpacity> |
| app/(tabs)/nursing.tsx | 184 | <TouchableOpacity onPress={() => setGender('male')} style={[gender === 'male' ? styles.filterOptionActive : styles.filterOption]} ><Text style={gender === 'male' ? styles.filterOptionTextActive : styles.filterOptionText}>رجال فقط</Text></TouchableOpacity> |
| app/(tabs)/nursing.tsx | 185 | <TouchableOpacity onPress={() => setGender('female')} style={[gender === 'female' ? styles.filterOptionActive : styles.filterOption]} ><Text style={gender === 'female' ? styles.filterOptionTextActive : styles.filterOptionText}>نساء فقط</Text></TouchableOpacity> |
| app/(tabs)/nursing.tsx | 188 | <Text style={[styles.filterLabel, { color: colors.textSecondary } ]}>التوافر (Availability)</Text> |
| app/(tabs)/nursing.tsx | 190 | <TouchableOpacity onPress={() => setAvailability('any')} style={[availability === 'any' ? styles.filterOptionActive : styles.filterOption]} ><Text style={availability === 'any' ? styles.filterOptionTextActive : styles.filterOptionText}>الكل</Text></TouchableOpacity> |
| app/(tabs)/nursing.tsx | 191 | <TouchableOpacity onPress={() => setAvailability('now')} style={[availability === 'now' ? styles.filterOptionActive : styles.filterOption]} ><Text style={availability === 'now' ? styles.filterOptionTextActive : styles.filterOptionText}>متاح الآن (للطوارئ)</Text></TouchableOpacity> |
| app/(tabs)/nursing.tsx | 194 | <Text style={[styles.filterLabel, { color: colors.textSecondary } ]}>الجنسية</Text> |
| app/(tabs)/nursing.tsx | 197 | <TouchableOpacity onPress={() => setNationality('any')} style={[nationality === 'any' ? styles.filterOptionActive : styles.filterOption]} ><Text style={nationality === 'any' ? styles.filterOptionTextActive : styles.filterOptionText}>الكل</Text></TouchableOpacity> |
| app/(tabs)/nursing.tsx | 198 | <TouchableOpacity onPress={() => setNationality('saudi')} style={[nationality === 'saudi' ? styles.filterOptionActive : styles.filterOption]} ><Text style={nationality === 'saudi' ? styles.filterOptionTextActive : styles.filterOptionText}>سعودي</Text></TouchableOpacity> |
| app/(tabs)/nursing.tsx | 199 | <TouchableOpacity onPress={() => setNationality('filipino')} style={[nationality === 'filipino' ? styles.filterOptionActive : styles.filterOption]} ><Text style={nationality === 'filipino' ? styles.filterOptionTextActive : styles.filterOptionText}>فلبيني</Text></TouchableOpacity> |
| app/(tabs)/nursing.tsx | 200 | <TouchableOpacity onPress={() => setNationality('egyptian')} style={[nationality === 'egyptian' ? styles.filterOptionActive : styles.filterOption]} ><Text style={nationality === 'egyptian' ? styles.filterOptionTextActive : styles.filterOptionText}>مصري</Text></TouchableOpacity> |
| app/(tabs)/nursing.tsx | 205 | <Text style={styles.applyBtnText}>تطبيق الفلاتر</Text> |
| app/(tabs)/pharmacy.tsx | 76 | setCategoriesData([{ id: 'all', label: 'الكل', icon: 'apps' }, ...mapped]); |
| app/(tabs)/pharmacy.tsx | 207 | placeholder={lang === 'ar' ? 'ابحث بالاسم أو المادة الفعالة...' : 'Search medicines...'} |
| app/(tabs)/pharmacy.tsx | 255 | <Text style={styles.bannerTitle}>وصفة طبية</Text> |
| app/(tabs)/pharmacy.tsx | 256 | <Text style={styles.bannerSub}>ارفع روشتة واطلب</Text> |
| app/(tabs)/pharmacy.tsx | 277 | <Text style={styles.bannerTitle}>طلباتي</Text> |
| app/(tabs)/pharmacy.tsx | 278 | <Text style={styles.bannerSub}>سجل طلبات الأدوية</Text> |
| app/(tabs)/pharmacy.tsx | 332 | <Text style={[styles.loadingText, { color: colors.t2 } ]}>جاري تحميل الأدوية...</Text> |
| app/(tabs)/pharmacy.tsx | 337 | <Text style={{ fontFamily: 'Cairo-Bold', fontSize: 18, color: colors.n, marginTop: 12 }}>لم نجد ما تبحث عنه</Text> |
| app/(tabs)/pharmacy.tsx | 342 | <Text style={{ fontFamily: 'Cairo-Bold', fontSize: 15, color: '#fff' }}>طلب يدوي</Text> |
| app/(tabs)/pharmacy.tsx | 380 | <Text style={[styles.currency, { color: colors.t3 } ]}>ر.س</Text> |
| app/(tabs)/pharmacy.tsx | 399 | [{ text: isRTL ? 'موافق' : 'OK' }] |
| app/(tabs)/services.tsx | 117 | <SectionHeader title="الخدمات الرئيسية" /> |
| app/(tabs)/services.tsx | 161 | <SectionHeader title="خدمات إضافية" /> |
| app/ai/chat-doctor.tsx | 32 | suggestions: ['عندي صداع', 'اريد فهم تحاليلي', 'احجز لي موعد', 'معلومات عن دواء'], |
| app/ai/chat-doctor.tsx | 84 | options = ['احجز موعد', 'سأكتفي بهذا']; |
| app/ai/chat-doctor.tsx | 96 | Alert.alert('خطأ', 'فشل الاتصال بالطبيب الذكي. يرجى المحاولة لاحقاً.'); |
| app/ai/chat-doctor.tsx | 209 | <TouchableOpacity style={[styles.micBtn, { backgroundColor: isDark ? colors.background : '#EEF2FF' }]} onPress={() => Alert.alert('صوت', 'التسجيل الصوتي غير متاح حالياً')}> |
| app/ai/chat-doctor.tsx | 217 | placeholder="اكتب سؤالك الطبي..." |
| app/ai/monthly-report.tsx | 73 | const [expandedItem, setExpandedItem] = useState<string \| null>('ضغط الدم 🫀'); |
| app/ai/prescription-translator.tsx | 25 | sideEffects: ['غثيان', 'آلام معدة'], |
| app/ai/prescription-translator.tsx | 27 | alternatives: ['جلوكوفاج', 'جلوكومين'], |
| app/ai/prescription-translator.tsx | 36 | interactions: ['تجنب مع عصير الجريب فروت'], |
| app/ai/prescription-translator.tsx | 37 | sideEffects: ['آلام عضلية نادرة'], |
| app/ai/prescription-translator.tsx | 39 | alternatives: ['ليبيتور', 'توفاست'], |
| app/ai/prescription-translator.tsx | 71 | Alert.alert('الإذن مطلوب', 'يرجى تفعيل صلاحية الوصول للكاميرا/المعرض للاستمرار.'); |
| app/ai/prescription-translator.tsx | 92 | Alert.alert('خطأ', 'فشل قراءة ملف الصورة كـ Base64.'); |
| app/ai/prescription-translator.tsx | 97 | Alert.alert('خطأ', 'حدث خطأ أثناء اختيار الصورة.'); |
| app/ai/prescription-translator.tsx | 134 | sideEffects: med.sideEffects \|\| ['صداع خفيف', 'اضطراب معدة بسيط'], |
| app/ai/prescription-translator.tsx | 136 | alternatives: med.alternatives \|\| ['متوفر بدائل بالصيدلية'], |
| app/ai/prescription-translator.tsx | 153 | Alert.alert('خطأ في الترجمة', 'لم نتمكن من معالجة صورة الوصفة الطبية. يرجى التأكد من وضوح الصورة والمحاولة مرة أخرى.'); |
| app/ai/prescription-translator.tsx | 179 | <Button label="ابدأ الترجمة" variant="gradient" icon="robot" loading={translating} onPress={handleSelectImage} /> |
| app/ai/prescription-translator.tsx | 210 | <SectionHeader title={`الأدوية (${RESULT.medications.length})`} /> |
| app/ai/prescription-translator.tsx | 269 | <Button label={`اطلب — ${med.price} ر.س`} variant="primary" icon="shopping_cart" size="sm" full={false} onPress={() => router.push('/(tabs)/pharmacy')} style={{ flex: 1 }} /> |
| app/ai/prescription-translator.tsx | 270 | <Button label="تفاصيل" variant="outline" icon="info" size="sm" full={false} onPress={() => router.push('/pharmacy/product-detail')} style={{ flex: 1 }} /> |
| app/ai/prescription-translator.tsx | 289 | <Button label="إضافة للتذكيرات" variant="outline" icon="bell" onPress={() => router.push('/health/medication-reminder-add')} /> |
| app/ai/prescription-translator.tsx | 290 | <Button label="مشاركة مع الطبيب" variant="ghost" icon="share" onPress={() => router.push('/consultations/share-report')} /> |
| app/ai/skin-analysis.tsx | 34 | products: ['مرطب نيفيا', 'سيروم فيتامين C', 'كريم SPF 50'], |
| app/ai/skin-analysis.tsx | 44 | const [selectedArea, setSelectedArea] = useState('الوجه'); |
| app/ai/skin-analysis.tsx | 47 | const BODY_AREAS = ['الوجه', 'اليدان', 'الظهر', 'الجسم']; |
| app/ai/skin-analysis.tsx | 56 | Alert.alert('الإذن مطلوب', 'يرجى تفعيل صلاحية الوصول للكاميرا/المعرض للاستمرار.'); |
| app/ai/skin-analysis.tsx | 77 | Alert.alert('خطأ', 'فشل قراءة ملف الصورة كـ Base64.'); |
| app/ai/skin-analysis.tsx | 82 | Alert.alert('خطأ', 'حدث خطأ أثناء التقاط الصورة.'); |
| app/ai/skin-analysis.tsx | 109 | recommendations: res.recommendations \|\| ['استخدم غسول لطيف للبشرة', 'تجنب الفرك الشديد'], |
| app/ai/skin-analysis.tsx | 119 | Alert.alert('خطأ في التحليل', 'فشل تحليل صورة الجلد. يرجى المحاولة لاحقاً والتأكد من وضوح الصورة.'); |
| app/ai/skin-analysis.tsx | 149 | {['تحليل لون البشرة', 'قياس مستوى الترطيب', 'فحص البنية الجلدية', 'مقارنة بقاعدة بيانات ضخمة'].map((s, i) => ( |
| app/ai/symptom-checker.tsx | 40 | symptoms: ["صداع", "دوار", "ألم في الرأس"], |
| app/ai/symptom-checker.tsx | 47 | symptoms: ["التهاب حلق", "بلع صعب"], |
| app/ai/symptom-checker.tsx | 54 | symptoms: ["ألم صدر", "ضيق تنفس", "سعال"], |
| app/ai/symptom-checker.tsx | 61 | symptoms: ["ألم بطن", "غثيان", "إسهال"], |
| app/ai/symptom-checker.tsx | 68 | symptoms: ["ألم ذراع", "تنميل"], |
| app/ai/symptom-checker.tsx | 75 | symptoms: ["ألم ذراع", "تنميل"], |
| app/ai/symptom-checker.tsx | 82 | symptoms: ["ألم أسفل البطن", "ألم في الظهر"], |
| app/ai/symptom-checker.tsx | 89 | symptoms: ["ألم ساق", "تورم", "تشنج"], |
| app/ai/symptom-checker.tsx | 96 | symptoms: ["ألم ساق", "تورم", "تشنج"], |
| app/ai/symptom-checker.tsx | 132 | const SEVERITY_OPTIONS = ["خفيف", "متوسط", "شديد", "شديد جداً"]; |
| app/ai/symptom-checker.tsx | 161 | const symptomsText = `الأعراض: ${symptomLabels.join("، ")}. الشدة: ${severity \|\| "غير محددة"}. المدة: ${duration \|\| "غير محددة"}.`; |
| app/ai/symptom-timeline.tsx | 20 | symptoms: ["صداع", "حمى"], |
| app/ai/symptom-timeline.tsx | 26 | symptoms: ["تعب", "ألم حلق"], |
| app/ai/symptom-timeline.tsx | 30 | { date: "3 أيام", symptoms: ["سعال"], severity: "خفيف", color: "#5BA84F" }, |
| app/ai/triage.tsx | 64 | tests: u === 'emergency' ? ['رسم قلب ECG', 'تحليل إنزيمات القلب'] : ['قياس المؤشرات الحيوية والضغط'], |
| app/ai/triage.tsx | 74 | Alert.alert('خطأ', 'فشل الاتصال بمساعد التشخيص الذكي. يرجى المحاولة لاحقاً.'); |
| app/ai/triage.tsx | 94 | setMessages([{ id: '1', sender: 'bot', text: 'مرحباً بك في المساعد الطبي الذكي لتصنيف الأعراض. صف لي ما تشعر به باختصار؟' }]); |
| app/ai/triage.tsx | 174 | {['أشعر بألم شديد وثقل في صدري وضيق تنفس', 'أشعر بدوخة شديدة وعطش مستمر ومستوى السكر غير مستقر', 'صداع مستمر وحرارة مرتفعة منذ يومين'].map((s, i) => ( |
| app/ai/triage.tsx | 198 | placeholder="اكتب أعراضك هنا (مثال: أشعر بصداع كلي...)" |
| app/ai-assistant.tsx | 122 | <DSBadge label="تشخيص الأعراض" variant="info" style={styles.chip} /> |
| app/ai-assistant.tsx | 123 | <DSBadge label="قراءة روشتة" variant="success" style={styles.chip} /> |
| app/ai-assistant.tsx | 124 | <DSBadge label="معلومات دواء" variant="warning" style={styles.chip} /> |
| app/ai-assistant.tsx | 150 | placeholder="اكتب استفسارك الطبي..." |
| app/community/hub.tsx | 62 | [{ text: "إلغاء", style: "cancel" }, { text: "نشر", onPress: (txt) => { if (txt) Alert.alert("تم النشر", "تم إرسال منشورك للمراجعة والظهور في المجتمع الصحي بنجاح."); } }] |
| app/community/hub.tsx | 81 | <SectionHeader title="الخيارات" /> |
| app/community/hub.tsx | 91 | {["مقالات طبية", "تجارب المرضى", "أسئلة وأجوبة", "قصص نجاح"].map( |
| app/community/hub.tsx | 111 | <SectionHeader title="المنشورات الحالية" /> |
| app/community/hub.tsx | 138 | <Badge label={post.category \|\| "عام"} color={colors.primary} /> |
| app/community/live-session.tsx | 31 | <Button label="استعرض الاستشارات المتاحة" variant="primary" icon="calendar" onPress={() => router.push('/(tabs)/consultations')} style={styles.cta} /> |
| app/community/post-detail.tsx | 71 | Alert.alert("تنبيه", err.message \|\| "فشل عملية التصويت"); |
| app/community/post-detail.tsx | 85 | Alert.alert("خطأ", err.message \|\| "فشل إضافة التعليق"); |
| app/community/post-detail.tsx | 108 | const displayBody = post?.body \|\| "لا يوجد محتوى للمنشور."; |
| app/community/post-detail.tsx | 109 | const authorName = post?.is_anonymous ? "عضو مجهول" : "طبيب معتمد"; |
| app/community/post-detail.tsx | 255 | placeholder="أضف تعليقاً..." |
| app/consultations/appointment-detail.tsx | 50 | const formattedDate = appointment?.scheduled_at ? new Date(appointment.scheduled_at).toLocaleDateString('ar-SA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : 'غداً'; |
| app/consultations/appointment-detail.tsx | 51 | const formattedTime = appointment?.scheduled_at ? new Date(appointment.scheduled_at).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) : '10:00 ص'; |
| app/consultations/appointment-detail.tsx | 152 | <Button label={AR ? `دفع ${appointment?.copay_amount \|\| 0} ريال` : `Pay ${appointment?.copay_amount \|\| 0} SAR`} onPress={() => { |
| app/consultations/appointment-detail.tsx | 157 | <Button variant="outline" label={AR ? 'إلغاء الموعد' : 'Cancel Appointment'} onPress={() => router.back()} /> |
| app/consultations/booking-confirm.tsx | 174 | Alert.alert('خطأ', err?.message \|\| 'تعذر تأكيد الحجز. الرجاء المحاولة مرة أخرى.'); |
| app/consultations/booking-confirm.tsx | 202 | <SectionHeader title="نوع الزيارة" /> |
| app/consultations/booking-confirm.tsx | 216 | <SectionHeader title="تفاصيل الموعد" /> |
| app/consultations/booking-confirm.tsx | 234 | <SectionHeader title="طريقة الدفع" /> |
| app/consultations/booking-confirm.tsx | 245 | <SectionHeader title="بيانات التأمين" /> |
| app/consultations/booking-confirm.tsx | 258 | <Button label="تعديل بيانات التأمين" variant="ghost" icon="edit" onPress={() => router.push('/profile/insurance')} /> |
| app/consultations/booking-confirm.tsx | 296 | <SectionHeader title="ملخص التكلفة" /> |
| app/consultations/booking-confirm.tsx | 351 | label={payMethod === 'insurance' ? 'التحقق من التأمين وتأكيد الحجز' : `تأكيد الحجز ودفع ${total} ر.س`} |
| app/consultations/call-history.tsx | 142 | const title = isCaller ? "اتصال صادر" : "اتصال وارد"; |
| app/consultations/cancel-reschedule.tsx | 18 | const NEW_DAYS = ['الأحد 16', 'الاثنين 17', 'الثلاثاء 18', 'الأربعاء 19', 'الخميس 20']; |
| app/consultations/cancel-reschedule.tsx | 19 | const NEW_TIMES = ['9:00 ص', '9:30 ص', '10:00 ص', '11:00 ص', '2:00 م', '3:00 م', '4:00 م']; |
| app/consultations/chat-with-doctor.tsx | 57 | setMessages(prev => [...prev, { id: newMsg.id, sender: 'doc', text: newMsg.content, time: 'الآن' }]); |
| app/consultations/chat-with-doctor.tsx | 74 | const newMsg = { id: Date.now(), sender: 'me', text: msg, time: 'الآن' }; |
| app/consultations/chat-with-doctor.tsx | 102 | <Text style={{ fontSize: 9, color: resolveColor('var(--gr)') }}>متصل الآن</Text> |
| app/consultations/chat-with-doctor.tsx | 114 | <Text style={{ textAlign: 'center', fontSize: 9, color: colors.t3, marginVertical: 4 }}>اليوم</Text> |
| app/consultations/chat-with-doctor.tsx | 143 | placeholder="اكتب رسالة..." |
| app/consultations/clinic/[id].tsx | 42 | <Text style={{ color: colors.textSecondary }}>المنشأة غير موجودة</Text> |
| app/consultations/clinic/[id].tsx | 65 | <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primary }}>{lang === 'ar' ? 'مستشفى وعيادات' : 'Hospital & Clinics'}</Text> |
| app/consultations/clinic/[id].tsx | 73 | <Text style={{ fontSize: 26, fontWeight: '900', color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left', marginBottom: 16 }}>{data?.name_ar \|\| 'مستشفى وعيادات نبض بلس'}</Text> |
| app/consultations/clinic/[id].tsx | 77 | <Text style={{ fontSize: 14, color: colors.textSecondary }}>{data?.city \|\| 'الرياض، المملكة العربية السعودية'}</Text> |
| app/consultations/clinic/[id].tsx | 80 | <Text style={{ fontSize: 19.5, fontWeight: '900', color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left', marginBottom: 12 }}>{lang === 'ar' ? 'نبذة عن المستشفى' : 'About Hospital'}</Text> |
| app/consultations/clinic/[id].tsx | 87 | <Text style={{ fontSize: 19.5, fontWeight: '900', color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left', marginBottom: 16 }}>{lang === 'ar' ? 'أطباء المستشفى' : 'Hospital Doctors'}</Text> |
| app/consultations/clinic-location.tsx | 35 | const name = data?.clinic_name \|\| 'العيادة'; |
| app/consultations/clinic-location.tsx | 57 | <Text style={{ fontSize: 16, fontWeight: '800', color: colors.n }}>موقع العيادة</Text> |
| app/consultations/clinic-location.tsx | 84 | <Text style={{ fontSize: 14, fontWeight: '800', color: colors.n }}>{data?.clinic_name \|\| 'عيادة الطبيب'}</Text> |
| app/consultations/clinic-location.tsx | 95 | <Text style={{ fontSize: 13, fontWeight: '800', color: '#fff' }}>فتح الاتجاهات</Text> |
| app/consultations/doctor/[id].tsx | 14 | const PERIODS = ['صباحي', 'ظهيرة', 'مسائي', 'ليلي']; |
| app/consultations/doctor/[id].tsx | 18 | ['٧:٠٠ ص', '٨:٠٠ ص', '٩:٠٠ ص', '١٠:٠٠ ص', '١١:٠٠ ص'], |
| app/consultations/doctor/[id].tsx | 19 | ['١٢:٠٠ م', '١:٠٠ م', '٢:٠٠ م'], |
| app/consultations/doctor/[id].tsx | 20 | ['٤:٠٠ م', '٥:٠٠ م', '٦:٠٠ م'], |
| app/consultations/doctor/[id].tsx | 21 | ['٨:٠٠ م', '٩:٠٠ م'] |
| app/consultations/doctor/[id].tsx | 83 | const arDays = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت']; |
| app/consultations/doctor/[id].tsx | 85 | const arMonths = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']; |
| app/consultations/doctor/[id].tsx | 91 | const toArNum = (n: number) => n.toString().replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]); |
| app/consultations/doctor/[id].tsx | 154 | <Text style={{ fontFamily: 'Cairo-Bold', fontSize: 18, color: colors.n, textAlign: 'center' }}>الطبيب غير متاح حالياً أو غير موجود</Text> |
| app/consultations/doctor/[id].tsx | 156 | <Text style={{ fontFamily: 'Cairo-Bold', color: '#fff', fontSize: 16 }}>العودة للقائمة</Text> |
| app/consultations/doctor/[id].tsx | 213 | <Text style={{ fontSize: 12.5, color: resolveColor('var(--n)'), fontWeight: '800', textDecorationLine: 'underline' }}>{lang === 'ar' ? 'مستشفى وعيادات نبض بلس' : 'Nabd Plus Hospital & Clinics'}</Text> |
| app/consultations/doctor/[id].tsx | 226 | <Text style={{ fontSize: 12, color: resolveColor('var(--t2)'), marginRight: isRTL ? 2 : 0, marginLeft: isRTL ? 0 : 2 }}>{lang === 'ar' ? 'ر.س' : 'SAR'}</Text> |
| app/consultations/doctor/[id].tsx | 340 | <Text style={{ fontSize: 15.5, fontWeight: '700', color: colors.n, marginBottom: 6, textAlign: isRTL ? 'right' : 'left' }}>عن الطبيب</Text> |
| app/consultations/doctor/[id].tsx | 345 | {(doc.tags \|\| ['مناظير', 'قولون', 'كبد']).map((t, i) => ( |
| app/consultations/doctor/[id].tsx | 356 | <Text style={{ fontSize: 19.5, fontWeight: '900', color: resolveColor('var(--p)') }}>{doc.exp \|\| '١٥+'}</Text> |
| app/consultations/doctor/[id].tsx | 357 | <Text style={{ fontSize: 8, color: resolveColor('var(--pt)') }}>سنة خبرة</Text> |
| app/consultations/doctor/[id].tsx | 360 | <Text style={{ fontSize: 19.5, fontWeight: '900', color: resolveColor('var(--tl)') }}>{doc.patients \|\| '٢,٥٠٠+'}</Text> |
| app/consultations/doctor/[id].tsx | 361 | <Text style={{ fontSize: 8, color: '#1A8A74' }}>مريض</Text> |
| app/consultations/doctor/[id].tsx | 365 | <Text style={{ fontSize: 8, color: '#B07D1E' }}>تقييم</Text> |
| app/consultations/doctor/[id].tsx | 373 | <Text style={{ fontSize: 15.5, fontWeight: '700', color: colors.n }}>{lang === 'ar' ? 'صور العيادة وغرفة الكشف' : 'Clinic & Examination Room'}</Text> |
| app/consultations/doctor/[id].tsx | 374 | <Text style={{ fontSize: 11, color: resolveColor('var(--pd)'), fontWeight: '600' }}>عرض الكل</Text> |
| app/consultations/doctor/[id].tsx | 389 | <Text style={{ fontSize: 15.5, fontWeight: '700', color: colors.n }}>{lang === 'ar' ? 'المستشفى والمرافق' : 'Hospital & Facilities'}</Text> |
| app/consultations/doctor/[id].tsx | 390 | <Text style={{ fontSize: 11, color: resolveColor('var(--pd)'), fontWeight: '600' }}>عرض الكل</Text> |
| app/consultations/doctor/[id].tsx | 404 | <Text style={{ fontSize: 15.5, fontWeight: '700', color: colors.n, marginBottom: 10, textAlign: isRTL ? 'right' : 'left' }}>معلومات إضافية</Text> |
| app/consultations/doctor/[id].tsx | 426 | <Text style={{ fontSize: 15.5, fontWeight: '700', color: colors.n, marginBottom: 10, textAlign: isRTL ? 'right' : 'left' }}>أسئلة شائعة</Text> |
| app/consultations/doctor/[id].tsx | 451 | <Text style={{ fontSize: 14, fontWeight: '800', color: '#fff' }}>تأكيد الحجز — {getPrice(activeVt)} ر.س</Text> |
| app/consultations/doctor-profile.tsx | 97 | Alert.alert('تم الانضمام بنجاح! ', 'لقد تمت إضافتك لقائمة الانتظار بنجاح. سنرسل لك إشعاراً فور توفر الموعد.'); |
| app/consultations/doctor-profile.tsx | 316 | <SectionHeader title="صور العيادة" actionLabel="عرض الكل" /> |
| app/consultations/doctor-profile.tsx | 329 | <SectionHeader title="الخدمات" /> |
| app/consultations/doctor-profile.tsx | 344 | <SectionHeader title="احجز موعدك" actionLabel="اختر اليوم" /> |
| app/consultations/doctor-profile.tsx | 380 | const labels = { morning: 'صباحاً', afternoon: 'مساءً', evening: 'ليلاً' }; |
| app/consultations/doctor-profile.tsx | 538 | <SectionHeader title="الأسئلة الشائعة" /> |
| app/consultations/doctor-profile.tsx | 550 | <SectionHeader title="أطباء مشابهون" actionLabel="عرض الكل" /> |
| app/consultations/doctor-profile.tsx | 581 | label="تأكيد الحجز" |
| app/consultations/doctor-search.tsx | 111 | placeholder="ابحث بالاسم أو التخصص..." |
| app/consultations/doctor-search.tsx | 125 | ["rating", "الأعلى تقييماً"], |
| app/consultations/doctor-search.tsx | 126 | ["price", "الأقل سعراً"], |
| app/consultations/doctor-search.tsx | 127 | ["wait", "الأقل انتظاراً"], |
| app/consultations/follow-up.tsx | 42 | setUpdates(p => [...p, { id: String(Date.now()), date: 'الآن', text: newUpdate, type: 'me' }]); |
| app/consultations/follow-up.tsx | 73 | <Badge label="متابعة نشطة" color={colors.success} icon="check_circle" /> |
| app/consultations/follow-up.tsx | 79 | <SectionHeader title="التشخيص" /> |
| app/consultations/follow-up.tsx | 85 | <SectionHeader title="الأدوية الموصوفة" /> |
| app/consultations/follow-up.tsx | 92 | <Button label="عرض الوصفة الكاملة" variant="ghost" icon="prescriptions" size="sm" onPress={() => router.push('/consultations/prescription-from-doctor')} style={{ marginTop: 8 }} /> |
| app/consultations/follow-up.tsx | 102 | <Button label="تأكيد" variant="primary" size="sm" full={false} onPress={() => router.push({ pathname: '/consultations/book/[id]', params: { id: '1' } })} /> |
| app/consultations/follow-up.tsx | 108 | <SectionHeader title="تحديثات الحالة" /> |
| app/consultations/follow-up.tsx | 120 | <Badge label={u.type === 'doctor' ? 'الطبيب' : 'أنت'} color={u.type === 'doctor' ? colors.primary : colors.secondary} /> |
| app/consultations/follow-up.tsx | 131 | <Input value={newUpdate} onChangeText={setNewUpdate} placeholder="كيف حالتك اليوم؟ أي تحسن أو أعراض جديدة؟" icon="edit" multiline /> |
| app/consultations/follow-up.tsx | 132 | <Button label="إرسال تحديث" variant="primary" icon="send" size="sm" onPress={sendUpdate} style={{ marginTop: 8 }}/> |
| app/consultations/follow-up.tsx | 137 | <Button label="محادثة الطبيب" variant="outline" icon="chat" onPress={() => router.push('/consultations/chat-with-doctor')} /> |
| app/consultations/follow-up.tsx | 138 | <Button label="حجز موعد متابعة" variant="gradient" icon="calendarCheck" onPress={() => router.push({ pathname: '/consultations/book/[id]', params: { id: '1' } })} /> |
| app/consultations/home-visit-tracking.tsx | 35 | <Text style={{ fontFamily: 'Cairo-Bold', fontSize: 16, color: colors.n, marginTop: 10, textAlign: 'center' }}>البيانات غير متوفرة أو فشل الاتصال</Text> |
| app/consultations/home-visit-tracking.tsx | 37 | <Text style={{ fontFamily: 'Cairo-Bold', color: '#fff' }}>رجوع</Text> |
| app/consultations/home-visit-tracking.tsx | 52 | <Text style={{ fontSize: 16, fontWeight: '800', color: colors.n }}>تتبع الزيارة المنزلية</Text> |
| app/consultations/home-visit-tracking.tsx | 71 | <Text style={{ fontSize: 10, color: colors.t3 }}>طبيب زيارات منزلية</Text> |
| app/consultations/home-visit-tracking.tsx | 74 | <Text style={{ fontSize: 16, fontWeight: '900', color: resolveColor('var(--p)') }}>{data?.wait_time \|\| '١٢'}</Text> |
| app/consultations/home-visit-tracking.tsx | 75 | <Text style={{ fontSize: 8, color: resolveColor('var(--pt)') }}>دقيقة</Text> |
| app/consultations/home-visit-tracking.tsx | 101 | <Text style={{ fontSize: 13, fontWeight: '800', color: '#fff' }}>اتصل بالطبيب</Text> |
| app/consultations/incoming-call.tsx | 23 | const callerName = (params.callerName as string) \|\| "د. محمد أحمد الكردي"; |
| app/consultations/offer/[id].tsx | 56 | const arDays = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت']; |
| app/consultations/offer/[id].tsx | 58 | const arMonths = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']; |
| app/consultations/offer/[id].tsx | 63 | const toArNum = (n: number) => n.toString().replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]); |
| app/consultations/offer/[id].tsx | 82 | const perArr = lang === 'ar' ? ['صباحي', 'ظهيرة', 'مسائي', 'ليلي'] : ['Morning', 'Noon', 'Evening', 'Night']; |
| app/consultations/offer/[id].tsx | 83 | const timesArr = lang === 'ar' ? [['٧:٠٠ ص', '٨:٠٠ ص', '٩:٠٠ ص'], ['١٢:٠٠ م', '١:٠٠ م', '٢:٠٠ م'], ['٤:٠٠ م', '٥:٠٠ م'], ['٩:٠٠ م', '١٠:٠٠ م']] : [['7:00 AM', '8:00 AM'], ['12:00 PM', '1:00 PM'], ['4:00 PM'], ['9:00 PM']]; |
| app/consultations/offer/[id].tsx | 114 | <Text style={{ fontSize: 18, fontWeight: '900', color: colors.n, marginBottom: 12, textAlign: isRTL ? 'right' : 'left' }}>تفاصيل العرض</Text> |
| app/consultations/offer/[id].tsx | 120 | <Text style={{ fontSize: 18, fontWeight: '900', color: colors.n }}>مقدمو الخدمة</Text> |
| app/consultations/offer/[id].tsx | 121 | <Text style={{ fontSize: 13, color: colors.t3, fontWeight: '700' }}>اختر العيادة المناسبة</Text> |
| app/consultations/offer/[id].tsx | 150 | <Text style={{ fontSize: 14, fontWeight: '900', color: resolveColor('var(--p)') }}>{prov.price} <Text style={{ fontSize: 9 }}>ر.س</Text></Text> |
| app/consultations/offer/[id].tsx | 158 | <Text style={{ fontSize: 18, fontWeight: '900', color: colors.n, marginBottom: 12, textAlign: isRTL ? 'right' : 'left' }}>اختر موعد الحجز</Text> |
| app/consultations/offer/[id].tsx | 227 | <Text style={{ fontSize: 11, color: colors.t3, marginBottom: 2 }}>السعر الإجمالي</Text> |
| app/consultations/offer/[id].tsx | 229 | {providers.find(p => p.id === selectedProvider)?.price} <Text style={{ fontSize: 12, color: colors.t3 }}>ر.س</Text> |
| app/consultations/offer/[id].tsx | 233 | <Text style={{ color: '#fff', fontSize: 16, fontWeight: '900', marginLeft: isRTL ? 8 : 0, marginRight: isRTL ? 0 : 8 }}>تأكيد وحجز</Text> |
| app/consultations/post-call-rating.tsx | 10 | const RATING_LABELS = ['', 'سيئ', 'مقبول', 'جيد', 'ممتاز', 'رائع جداً']; |
| app/consultations/post-call-rating.tsx | 11 | const TAGS = ['ممتاز', 'سريع', 'احترافي', 'نظيف', 'متعاون', 'أنصح به']; |
| app/consultations/post-call-rating.tsx | 56 | <Text style={{ fontSize: 16, fontWeight: '800', color: colors.n }}>التقييم</Text> |
| app/consultations/post-call-rating.tsx | 66 | <Text style={{ fontSize: 20, fontWeight: '900', color: colors.n, marginBottom: 6 }}>كيف كانت تجربتك؟</Text> |
| app/consultations/post-call-rating.tsx | 67 | <Text style={{ fontSize: 12, color: colors.t2, marginBottom: 24 }}>تقييمك يساعدنا على تحسين خدماتنا</Text> |
| app/consultations/post-call-rating.tsx | 89 | <Text style={{ fontSize: 13, fontWeight: '700', color: colors.n, marginBottom: 10, textAlign: isRTL ? 'right' : 'left' }}>أضف تعليقاً (اختياري)</Text> |
| app/consultations/post-call-rating.tsx | 92 | placeholder="اكتب رأيك في الخدمة..." |
| app/consultations/post-call-rating.tsx | 121 | {loading ? <ActivityIndicator color={colors.bg} /> : <Text style={{ fontSize: 14, fontWeight: '800', color: colors.bg }}>إرسال التقييم</Text>} |
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
| app/consultations/specialty-select.tsx | 68 | placeholder="ابحث عن تخصص..." |
| app/consultations/video-call.tsx | 155 | <Text style={styles.statusText}>{isConnected ? "في انتظار انضمام الطبيب..." : "غير متصل"}</Text> |
| app/delivery/address-select.tsx | 81 | <SectionHeader title="العناوين المحفوظة" /> |
| app/delivery/address-select.tsx | 108 | name={addr.label === 'العمل' ? 'hospital' : 'home'} |
| app/delivery/address-select.tsx | 145 | label="تأكيد العنوان" |
| app/diagnostics/book-sample.tsx | 29 | <SectionHeader title="مكان سحب العينة" /> |
| app/diagnostics/book-sample.tsx | 80 | <SectionHeader title="اختر التاريخ" /> |
| app/diagnostics/book-sample.tsx | 82 | {[{ key: 'today', label: 'اليوم' }, { key: 'tomorrow', label: 'غداً' }, { key: 'after', label: 'بعد غد' }].map(d => ( |
| app/diagnostics/book-sample.tsx | 89 | <SectionHeader title="اختر الوقت" /> |
| app/diagnostics/book-sample.tsx | 99 | <SectionHeader title="التحاليل المطلوبة" /> |
| app/diagnostics/book-sample.tsx | 112 | <SectionHeader title="تعليمات قبل السحب" /> |
| app/diagnostics/book-sample.tsx | 121 | <Button label={`تأكيد الحجز — ${location === 'home' ? selectedTime : selectedTime}`} variant="gradient" size="lg" icon="calendarCheck" onPress={() => router.push('/payments/processing')} /> |
| app/diagnostics/booking-confirm.tsx | 50 | Alert.alert('تنبيه', 'السلة فارغة حالياً'); |
| app/diagnostics/booking-confirm.tsx | 98 | Alert.alert('نجاح', 'تم حجز التحليل بنجاح!', [ |
| app/diagnostics/booking-confirm.tsx | 104 | Alert.alert('خطأ', err.message \|\| 'فشل إتمام الحجز. يرجى التأكد من كافة الحقول.'); |
| app/diagnostics/booking-confirm.tsx | 126 | <SectionHeader title="التحاليل المطلوبة" /> |
| app/diagnostics/booking-confirm.tsx | 140 | <SectionHeader title="مكان سحب العينة" /> |
| app/diagnostics/booking-confirm.tsx | 196 | <SectionHeader title="طريقة الدفع" /> |
| app/diagnostics/booking-confirm.tsx | 206 | <SectionHeader title="تفاصيل التأمين" /> |
| app/diagnostics/booking-confirm.tsx | 219 | <Input value={policyNumber} onChangeText={setPolicyNumber} placeholder="رقم بوليصة التأمين" icon="document" /> |
| app/diagnostics/booking-confirm.tsx | 220 | <Input value={memberId} onChangeText={setMemberId} placeholder="رقم عضوية التأمين" icon="user" /> |
| app/diagnostics/booking-confirm.tsx | 226 | <SectionHeader title="ملخص التكلفة" /> |
| app/diagnostics/booking-confirm.tsx | 254 | label={payMethod === 'insurance' ? 'التحقق من التأمين والحجز' : `تأكيد ودفع ${total} ر.س`} |
| app/diagnostics/checkout.tsx | 19 | const dayNames = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']; |
| app/diagnostics/checkout.tsx | 45 | const labName = params.labName \|\| 'مختبرات البرج'; |
| app/diagnostics/checkout.tsx | 47 | const totalParam = params.copay ? `${params.copay}` : (params.total \|\| '٢٩٩'); |
| app/diagnostics/checkout.tsx | 66 | const isCTorXRay = radiologyType.includes('مقطعية') \|\| radiologyType.includes('CT') \|\| radiologyType.includes('سينية') \|\| radiologyType.includes('X-Ray'); |
| app/diagnostics/checkout.tsx | 67 | const isMRI = radiologyType.includes('رنين') \|\| radiologyType.includes('MRI'); |
| app/diagnostics/insurance-approval.tsx | 20 | const labName = (params.labName as string) \|\| 'المختبر المختار'; |
| app/diagnostics/insurance-approval.tsx | 159 | const isCovered = item.status === 'مغطى'; |
| app/diagnostics/insurance-upload.tsx | 60 | Alert.alert('عذراً', 'نحتاج إلى صلاحية الوصول للكاميرا.'); |
| app/diagnostics/insurance-upload.tsx | 71 | Alert.alert('عذراً', 'نحتاج إلى صلاحية الوصول لمعرض الصور.'); |
| app/diagnostics/insurance-upload.tsx | 288 | Alert.alert('خطأ', 'حدث خطأ أثناء رفع الطلب'); |
| app/diagnostics/lab-comparison.tsx | 24 | const testName = name \|\| "باقة الفحص الشامل"; |
| app/diagnostics/my-results.tsx | 87 | const labName = b.provider_name \|\| "مختبر معتمد"; |
| app/diagnostics/my-results.tsx | 94 | let statusText = "قيد المراجعة"; |
| app/diagnostics/my-results.tsx | 157 | <Badge label="تقرير PDF جاهز" color={colors.success} /> |
| app/diagnostics/order/[id].tsx | 40 | Alert.alert('إلغاء الطلب', 'هل أنت متأكد من رغبتك في إلغاء هذا الطلب؟', [ |
| app/diagnostics/order/[id].tsx | 47 | Alert.alert('تم', 'تم إلغاء الطلب بنجاح'); |
| app/diagnostics/order/[id].tsx | 49 | Alert.alert('خطأ', 'حدث خطأ أثناء الإلغاء'); |
| app/diagnostics/order/[id].tsx | 58 | Alert.alert('جاري التحميل', 'يتم الآن تحميل التقرير بصيغة PDF...'); |
| app/diagnostics/order/[id].tsx | 61 | setTimeout(() => Alert.alert('نجاح', 'تم تحميل التقرير بنجاح وحفظه في جهازك'), 1500); |
| app/diagnostics/orders.tsx | 31 | title: b.items?.[0]?.name_ar \|\| b.items?.[0]?.name_en \|\| 'حجز تحاليل مخبرية', |
| app/diagnostics/packages.tsx | 20 | const [activeCat, setActiveCat] = useState("الكل"); |
| app/diagnostics/packages.tsx | 23 | const [categories, setCategories] = useState<string[]>(["الكل"]); |
| app/diagnostics/packages.tsx | 32 | setCategories(["الكل", ...cats]); |
| app/diagnostics/packages.tsx | 65 | placeholder="ابحث عن باقة..." |
| app/diagnostics/results-history.tsx | 64 | const title = item.items?.map((i: any) => i.name_ar).join(' + ') \|\| 'تحاليل مخبرية'; |
| app/diagnostics/results-history.tsx | 65 | const labName = item.provider_name \|\| 'مختبر معتمد'; |
| app/diagnostics/sample-tracking.tsx | 84 | <Button label="تصفح التحاليل" onPress={() => router.push('/(tabs)/diagnostics')} /> |
| app/diagnostics/sample-tracking.tsx | 139 | const tests = booking.items?.map((i: any) => i.name_ar \|\| i.name_en) \|\| ['تحاليل مخبرية']; |
| app/diagnostics/sample-tracking.tsx | 173 | <TouchableOpacity style={[styles.callBtn, { backgroundColor: '#E6FAF7' }]} onPress={() => Linking.openURL(`tel:${booking.technician_phone \|\| '0500000000'}`).catch(() => Alert.alert('خطأ', 'لا يمكن فتح تطبيق الاتصال'))}> |
| app/diagnostics/search.tsx | 66 | placeholder="ابحث عن تحليل..." |
| app/diagnostics/technician-tracking.tsx | 123 | label={status === "on_way" ? "في الطريق" : "وصل"} |
| app/diagnostics/technician-tracking.tsx | 132 | {(booking?.items?.map((i: any) => i.name_ar \|\| i.name_en) \|\| ["تحاليل مخبرية"]).map((t: string, i: number) => ( |
| app/diagnostics/technician-tracking.tsx | 152 | label="اتصل بالفني" |
| app/diagnostics/technician-tracking.tsx | 160 | label="رسالة" |
| app/drug-scanner/index.tsx | 32 | const COMMON_DRUGS = ['بنادول', 'إيبوبروفين', 'أموكسيسيلين', 'كلاريثروميسين', 'أوميبرازول', 'لوسارتان', 'فيتامين D', 'أوميغا 3']; |
| app/drug-scanner/index.tsx | 66 | const SEVERITY_LABELS = { major: 'خطير', moderate: 'متوسط', minor: 'خفيف' }; |
| app/drug-scanner/index.tsx | 75 | {['فحص التفاعلات الثنائية', 'تحليل التداخلات المعروفة', 'مراجعة جرعات الأمان', 'توليد التوصيات'].map((s, i) => ( |
| app/emergency/sos-active.tsx | 18 | const [dispatchStatus, setDispatchStatus] = useState('لم يتم استلام حالة طوارئ نشطة بعد.'); |
| app/emergency/sos-active.tsx | 66 | <Badge label={emergency?.location ? 'موقع مستلم من الطلب' : 'الموقع غير متاح'} color={emergency?.location ? colors.success : colors.warning} /> |
| app/emergency/sos-active.tsx | 113 | <Button label="العودة للرئيسية" variant="primary" size="lg" style={{ flex: 1 }} onPress={() => router.push('/(tabs)/index' as any)} /> |
| app/family/calendar.tsx | 222 | <SectionHeader title={`أحداث ${DAYS[selectedDay]}`} /> |
| app/family/calendar.tsx | 224 | label="إضافة حدث " |
| app/family/chat.tsx | 38 | setMessages(p => [...p, { id: String(Date.now()), text: msg, sender: 'أنت', time: 'الآن', type: 'text', isMe: true }]); |
| app/family/chat.tsx | 90 | <TextInput value={msg} onChangeText={setMsg} placeholder="اكتب رسالة..." placeholderTextColor={colors.textTertiary} style={[st.input, { backgroundColor: colors.surfaceSecondary, color: colors.textPrimary }]} onSubmitEditing={send} /> |
| app/family/emergency-contacts.tsx | 93 | <SectionHeader title={`جهات الطوارئ (${CONTACTS.length})`} /> |
| app/family/emergency-contacts.tsx | 116 | <Badge label="طوارئ" color={colors.error} icon="emergency" /> |
| app/family/emergency-contacts.tsx | 119 | <Badge label="SOS مفعّل" color={colors.success} icon="bell" /> |
| app/family/emergency-contacts.tsx | 135 | label="إضافة جهة اتصال طوارئ" |
| app/family/hub.tsx | 73 | const [group, setGroup] = useState<any>({ name: "عائلة أحمد" }); |
| app/family/hub.tsx | 157 | <SectionHeader title="أفراد العائلة" /> |
| app/family/hub.tsx | 187 | <Badge label={isOwner ? "مسؤول" : "عضو"} color={color} /> |
| app/family/hub.tsx | 189 | <Badge label="نشط" color={colors.success} /> |
| app/family/invite.tsx | 68 | <SectionHeader title="بيانات الفرد (اختياري)" /> |
| app/family/invite.tsx | 69 | <Input value={name} onChangeText={setName} placeholder="اسم الفرد" icon="user" /> |
| app/family/invite.tsx | 78 | <SectionHeader title="طريقة الدعوة" /> |
| app/family/invite.tsx | 93 | <Button label="مشاركة الرابط" variant="gradient" icon="share" onPress={shareLink} /> |
| app/family/join.tsx | 83 | label="الذهاب للعائلة" |
| app/family/join.tsx | 134 | placeholder="مثال: NABDAH-F7X2K9" |
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
| app/family/permission-request.tsx | 102 | <Badge label="طلب جديد" color={colors.warning} /> |
| app/family/permission-request.tsx | 113 | <SectionHeader title="الصلاحيات المطلوبة" /> |
| app/family/permission-request.tsx | 126 | label={perm.granted ? 'مسموح' : 'مرفوض'} |
| app/family/permission-request.tsx | 145 | <Button label="قبول الصلاحيات" variant="gradient" icon="check_circle" onPress={handleAccept} full={false} style={{ flex: 1 }}/> |
| app/family/permission-request.tsx | 146 | <Button label="رفض الكل" variant="outline" icon="close" onPress={handleReject} full={false} style={{ flex: 1 }}/> |
| app/family/permissions.tsx | 106 | const memberName = (params.name as string) \|\| "فرد من العائلة"; |
| app/family/permissions.tsx | 107 | const memberRelation = (params.relation as string) \|\| "قريب"; |
| app/family/permissions.tsx | 147 | Alert.alert('خطأ', 'تعذر إرسال طلب الصلاحيات'); |
| app/family/permissions.tsx | 286 | label="إزالة الفرد من العائلة" |
| app/family/permissions.tsx | 343 | label="طلب تعديل الصلاحيات" |
| app/family/shared-calendar.tsx | 223 | <SectionHeader title={`أحداث ${DAYS[selectedDay]}`} /> |
| app/family/shared-calendar.tsx | 225 | label="إضافة حدث " |
| app/family/voice-call.tsx | 54 | label={muted ? "رفع الصوت" : "كتم"} |
| app/family/voice-call.tsx | 60 | label="مكبّر" |
| app/family/voice-call.tsx | 66 | label="رسالة" |
| app/health/actionable-order.tsx | 61 | <Text style={styles.headerTitle}>أوامر طبية قابلة للتنفيذ</Text> |
| app/health/actionable-order.tsx | 69 | <Text style={styles.alertTitle}>انتهت الاستشارة بنجاح</Text> |
| app/health/actionable-order.tsx | 70 | <Text style={styles.alertSub}>قام الطبيب بإصدار الأوامر الطبية التالية. يمكنك تنفيذها الآن مباشرة عبر منصة نبض.</Text> |
| app/health/actionable-order.tsx | 79 | <Text style={styles.sectionTitle}>الوصفة الطبية (E-Rx)</Text> |
| app/health/actionable-order.tsx | 92 | <Text style={styles.actionBtnText}>اطلب الأدوية الآن (صيدلية نبض)</Text> |
| app/health/actionable-order.tsx | 99 | <Text style={[styles.sectionTitle, { color: theme.textSub }]}>لا توجد أدوية موصوفة</Text> |
| app/health/actionable-order.tsx | 109 | <Text style={styles.sectionTitle}>التحاليل الطبية (Labs)</Text> |
| app/health/actionable-order.tsx | 121 | <Text style={styles.actionBtnText}>حجز زيارة منزلية لسحب الدم</Text> |
| app/health/actionable-order.tsx | 131 | <Text style={styles.sectionTitle}>طلب أشعة (Radiology)</Text> |
| app/health/actionable-order.tsx | 143 | <Text style={styles.actionBtnText}>استعراض المراكز القريبة</Text> |
| app/health/chronic-disease.tsx | 54 | {[{ num: conditions.length.toString(), label: 'حالة' }, { num: conditions.filter(c => c.controlled).length.toString(), label: 'تحت السيطرة' }, { num: conditions.reduce((acc, c) => acc + (c.medications?.length \|\| 0), 0).toString(), label: 'أدوية' }].map((s, i) => ( |
| app/health/chronic-medications.tsx | 103 | <Button label="طلب من الصيدلية الآن" variant="primary" icon="shopping_cart" size="sm" onPress={() => orderFromPharmacy(m)} style={{ marginTop: 8 }} /> |
| app/health/chronic-medications.tsx | 109 | <Button label="إضافة دواء مزمن جديد" variant="outline" icon="add" onPress={() => router.push('/health/medication-reminder-add')} /> |
| app/health/conditions-allergies.tsx | 81 | const [myAllergies, setMyAllergies] = useState<string[]>(["بنسلين"]); |
| app/health/conditions-allergies.tsx | 151 | <SectionHeader title="الأمراض المزمنة" /> |
| app/health/conditions-allergies.tsx | 155 | placeholder="ابحث عن مرض..." |
| app/health/conditions-allergies.tsx | 211 | <SectionHeader title="الحساسية" /> |
| app/health/conditions-allergies.tsx | 215 | placeholder="ابحث عن حساسية..." |
| app/health/conditions-allergies.tsx | 300 | label="حفظ" |
| app/health/edit-profile.tsx | 29 | const GENDERS = ["ذكر", "أنثى"]; |
| app/health/edit-profile.tsx | 222 | <Field label="الاسم الكامل" field="name" iconName="edit" /> |
| app/health/edit-profile.tsx | 224 | label="رقم الجوال" |
| app/health/edit-profile.tsx | 230 | label="البريد الإلكتروني" |
| app/health/edit-profile.tsx | 235 | <Field label="تاريخ الميلاد" field="dob" iconName="calendar_today" /> |
| app/health/edit-profile.tsx | 237 | label="رقم الهوية" |
| app/health/edit-profile.tsx | 435 | placeholder="أضف حساسية..." |
| app/health/family-hub.tsx | 190 | label="إنشاء مجموعة عائلية" |
| app/health/family-hub.tsx | 197 | label="انضم لعائلة حالية" |
| app/health/family-hub.tsx | 227 | <SectionHeader title="أفراد العائلة" /> |
| app/health/family-hub.tsx | 257 | <Badge label={isOwner ? "مسؤول" : "عضو"} color={color} /> |
| app/health/family-hub.tsx | 259 | <Badge label="نشط" color={colors.success} /> |
| app/health/medication-reminder-add.tsx | 27 | const TIME_PRESETS = ['06:00 ص', '08:00 ص', '12:00 م', '02:00 م', '06:00 م', '08:00 م', '10:00 م']; |
| app/health/medication-reminder-add.tsx | 40 | const [selectedTimes, setSelectedTimes] = useState<string[]>(['08:00 ص', '08:00 م']); |
| app/health/medication-reminder-add.tsx | 74 | <SectionHeader title="اسم الدواء" /> |
| app/health/medication-reminder-add.tsx | 75 | <Input value={name} onChangeText={setName} placeholder="مثال: بنادول إكسترا 500mg" icon="medication" /> |
| app/health/medication-reminder-add.tsx | 77 | <Button label="البحث في الصيدلية" variant="ghost" icon="search" size="sm" full={false} onPress={() => router.push('/(tabs)/pharmacy')} /> |
| app/health/medication-reminder-add.tsx | 78 | <Button label="من وصفة طبية" variant="ghost" icon="prescriptions" size="sm" full={false} onPress={() => router.push('/health/prescriptions')} /> |
| app/health/medication-reminder-add.tsx | 84 | <SectionHeader title="الجرعة" /> |
| app/health/medication-reminder-add.tsx | 115 | <SectionHeader title="مواعيد الجرعات" /> |
| app/health/medication-reminder-add.tsx | 131 | <SectionHeader title="تعليمات" /> |
| app/health/medication-reminder-add.tsx | 141 | <SectionHeader title="التكرار" /> |
| app/health/medication-reminder-add.tsx | 147 | <SectionHeader title="المدة" /> |
| app/health/medication-reminder-add.tsx | 186 | <Input value={notes} onChangeText={setNotes} placeholder="ملاحظات إضافية (اختياري)" icon="edit" multiline /> |
| app/health/medication-reminder-add.tsx | 190 | <Button label="حفظ التذكير" variant="gradient" size="lg" icon="bell" loading={saving} onPress={handleSave} /> |
| app/health/medication-reminder-list.tsx | 116 | <SectionHeader title={`في الانتظار (${pending.length})`} /> |
| app/health/medication-reminder-list.tsx | 157 | <Badge label="مزمن" color={colors.warning} /> |
| app/health/medication-reminder-list.tsx | 160 | <Badge label="مؤجّل" color={colors.textTertiary} /> |
| app/health/medication-reminder-list.tsx | 166 | label="تم أخذها" |
| app/health/medication-reminder-list.tsx | 175 | label="غفوة 30 دق" |
| app/health/medication-reminder-list.tsx | 216 | <SectionHeader title={`تم أخذها (${done.length})`} /> |
| app/health/medication-reminder-list.tsx | 243 | <Badge label="تم" color={colors.success} icon="check_circle" /> |
| app/health/prescriptions.tsx | 51 | {[{ num: prescriptions.length.toString(), label: 'وصفة' }, { num: prescriptions.reduce((acc, p) => acc + (p.medications?.length \|\| 0), 0).toString(), label: 'دواء' }, { num: prescriptions.filter(p => !p.isPurchased).length.toString(), label: 'معلقة' }].map((s, i) => ( |
| app/health/refills.tsx | 107 | <SectionHeader title="مستوى مخزون أدويتك المزمنة" /> |
| app/health/refills.tsx | 120 | label={isCritical ? `حرج: ${med.remainingDays} أيام متبقية` : `${med.remainingDays} يوماً متبقياً`} |
| app/health/refills.tsx | 140 | label="أعد صرف الدواء الآن" |
| app/health/reminders.tsx | 82 | Alert.alert('خطأ', 'تعذر تحديث حالة الجرعة'); |
| app/health/reminders.tsx | 177 | <SectionHeader title="جرعات اليوم" /> |
| app/health/sleep-score.tsx | 48 | const scoreLabel = SLEEP_DATA.score >= 80 ? 'ممتاز' : SLEEP_DATA.score >= 60 ? 'جيد' : 'يحتاج تحسين'; |
| app/health/sleep-tracker.tsx | 30 | const QUALITY_LABELS = { excellent: 'ممتاز', good: 'جيد', fair: 'متوسط', poor: 'ضعيف' }; |
| app/health/smart-reminders.tsx | 93 | {([['all', 'الكل'], ['ai', 'AI ذكي'], ['medications', 'أدوية']] as const).map(([key, label]) => ( |
| app/health/vitals-log.tsx | 161 | <Badge label={avg < 130 ? 'طبيعي' : 'مرتفع'} color={avg < 130 ? colors.success : colors.warning} /> |
| app/health/vitals-log.tsx | 172 | <SectionHeader title={`${config.label} — آخر ${periodLabels[period]}`} /> |
| app/health/vitals-log.tsx | 188 | <SectionHeader title="آخر القراءات" /> |
| app/health/vitals-log.tsx | 232 | <Input value={value1} onChangeText={setValue1} placeholder="الانقباضي" keyboardType="numeric" icon="trending_up" style={{ flex: 1 }}/> |
| app/health/vitals-log.tsx | 234 | <Input value={value2} onChangeText={setValue2} placeholder="الانبساطي" keyboardType="numeric" icon="trendingDown" style={{ flex: 1 }}/> |
| app/health/vitals-log.tsx | 237 | <Input value={value1} onChangeText={setValue1} placeholder={`القراءة (${config.unit})`} keyboardType="numeric" icon={config.icon} style={{ marginTop: 8 }}/> |
| app/health/vitals-log.tsx | 250 | <Button label="حفظ القراءة" variant="gradient" size="lg" icon="check_circle" loading={saving} onPress={handleSave} style={{ marginTop: 16 }}/> |
| app/health/vitals.tsx | 175 | label="إضافة قراءة جديدة" |
| app/health/vitals.tsx | 181 | label="عرض الرسوم البيانية" |
| app/insurance/add-policy.tsx | 31 | Alert.alert('المسح غير متاح', 'لا يمكن مسح أو استخراج بيانات بطاقة التأمين حتى يتوفر عقد رفع وتحقيق خادمي محمي.'); |
| app/insurance/add-policy.tsx | 35 | Alert.alert('الحفظ غير متاح', 'لم تُحفظ أي بوليصة. يتطلب هذا التدفق عقد خادمي للتحقق من العضوية ورفع المستندات قبل تفعيله.'); |
| app/insurance/approval-pending.tsx | 62 | <Button label={`ادفع كاش — ${totalAmount} ر.س`} variant="gradient" icon="card" onPress={() => router.push('/payments/processing')} /> |
| app/insurance/approval-pending.tsx | 63 | <Button label="اتصل بشركة التأمين" variant="outline" icon="call" onPress={() => router.replace('/(tabs)/consultations')} /> |
| app/insurance/approval-pending.tsx | 64 | <Button label="إلغاء" variant="ghost" icon="close" onPress={() => router.back()} /> |
| app/insurance/approval-pending.tsx | 121 | <Button label={copayAmount > 0 ? `تأكيد ودفع ${copayAmount} ر.س` : 'تأكيد (بدون دفع)'} variant="gradient" size="lg" icon="check_circle" onPress={() => router.push('/payments/processing')} /> |
| app/insurance/copay.tsx | 46 | <Text style={[styles.title, { color: colors.t1 }]}>{isRTL ? 'تم الدفع بنجاح' : 'Payment Successful'}</Text> |
| app/insurance/copay.tsx | 56 | <Header title={isRTL ? 'موافقة التأمين' : 'Insurance Approval'} /> |
| app/insurance/copay.tsx | 69 | <Text style={[styles.amountLabel, { color: colors.t2 }]}>{isRTL ? 'المبلغ المطلوب دفعه' : 'Amount to Pay'}</Text> |
| app/insurance/copay.tsx | 70 | <Text style={[styles.amountValue, { color: colors.p }]}>{amount \|\| '0'} {isRTL ? 'ر.س' : 'SAR'}</Text> |
| app/insurance/copay.tsx | 78 | <Text style={styles.payBtnText}>{loading ? (isRTL ? 'جاري الدفع...' : 'Processing...') : (isRTL ? 'تأكيد الدفع' : 'Confirm Payment')}</Text> |
| app/insurance/coverage-check.tsx | 40 | Alert.alert('تعذر الفحص', 'تأكد من تسجيل بيانات التأمين في ملفك الشخصي'); |
| app/insurance/coverage-check.tsx | 50 | {['فحص شبكة المزودين', 'حساب نسبة التغطية', 'التحقق من الحد السنوي'].map((s, i) => ( |
| app/insurance/coverage-check.tsx | 239 | placeholder="اسم الطبيب أو المستشفى أو الصيدلية" |
| app/insurance/hub.tsx | 146 | Alert.alert('انتهت المهلة', 'لم يتم العثور على نتائج تأمين. تأكد من إدخال رقم الهوية والضغط على استعلام.'); |
| app/insurance/hub.tsx | 150 | Alert.alert('خطأ في الاستعلام', msg.message \|\| 'تعذّر جلب بيانات التأمين من بوابة الضمان.'); |
| app/insurance/hub.tsx | 178 | [{ text: 'موافق' }] |
| app/insurance/hub.tsx | 188 | Alert.alert('خطأ', 'تم سحب البيانات لكن فشل حفظها. يرجى المحاولة لاحقاً.'); |
| app/insurance/network-providers.tsx | 80 | placeholder="ابحث عن مزود..." |
| app/insurance/payment-split.tsx | 92 | Alert.alert('خطأ', 'فشل تأكيد الدفع، يرجى المحاولة مجدداً'); |
| app/insurance/submit-claim.tsx | 34 | Alert.alert("تم تقديم المطالبة", "سيتم مراجعتها خلال 2-5 أيام عمل"); |
| app/insurance/submit-claim.tsx | 36 | Alert.alert("خطأ", "تعذر تقديم المطالبة"); |
| app/insurance/submit-claim.tsx | 75 | <SectionHeader title="الخيارات" /> |
| app/loyalty/hub.tsx | 19 | { id: 'bronze', label: 'برونزي', icon: 'emoji_events', color: '#CD7C3C', minPts: 0, maxPts: 1000, perks: ['5% كاشباك'] }, |
| app/loyalty/hub.tsx | 197 | {([['earn', 'اكسب نقاطاً'], ['redeem', 'استبدال'], ['activity', 'السجل']] as const).map(([t, l]) => ( |
| app/loyalty/referrals.tsx | 60 | Alert.alert("نسخ الكود", "تم نسخ كود الإحالة الخاص بك بنجاح!"); |
| app/loyalty/referrals.tsx | 171 | label="نسخ الكود" |
| app/loyalty/referrals.tsx | 178 | label="مشاركة الكود" |
| app/loyalty/referrals.tsx | 208 | <SectionHeader title="سجل الإحالات والمدعوين" /> |
| app/loyalty/rewards.tsx | 44 | Alert.alert('رصيد غير كافٍ', 'عذراً، لا تملك نقاطاً كافية لاستبدال هذه المكافأة.'); |
| app/loyalty/rewards.tsx | 66 | [{ text: 'حسناً' }] |
| app/loyalty/rewards.tsx | 70 | Alert.alert('خطأ', 'حدث خطأ أثناء استبدال المكافأة. يرجى المحاولة لاحقاً.'); |
| app/loyalty/rewards.tsx | 111 | <SectionHeader title="المكافآت المتاحة" /> |
| app/map/index.tsx | 412 | placeholder="ابحث عن دكتور، صيدلية، مستشفى..." |
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
| app/maternity/baby-growth.tsx | 17 | const arabicNums = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩']; |
| app/maternity/baby-growth.tsx | 302 | placeholder="مثال: 6" |
| app/maternity/baby-growth.tsx | 313 | placeholder="مثال: 7.5" |
| app/maternity/baby-growth.tsx | 324 | placeholder="مثال: 65" |
| app/maternity/baby-growth.tsx | 335 | placeholder="مثال: 42" |
| app/maternity/hub.tsx | 24 | const arabicNums = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩']; |
| app/maternity/hub.tsx | 239 | const trimesterText = week <= 12 ? 'الثلث الأول' : week <= 26 ? 'الثلث الثاني' : 'الثلث الثالث'; |
| app/maternity/hub.tsx | 346 | <Badge label={ovulationData.regular ? "دورة منتظمة" : "دورة غير منتظمة"} color="#7C3AED" bg={colors.surface} /> |
| app/maternity/hub.tsx | 433 | const isCurrent = c.week === `${week} أسبوع`; |
| app/maternity/maternity-setup.tsx | 17 | const arabicNums = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩']; |
| app/maternity/maternity-setup.tsx | 32 | const daysOfWeek = ['س', 'ح', 'ن', 'ث', 'ر', 'خ', 'ج']; |
| app/maternity/ovulation-tracker.tsx | 18 | const arabicNums = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩']; |
| app/maternity/ovulation-tracker.tsx | 32 | const daysOfWeek = ['س', 'ح', 'ن', 'ث', 'ر', 'خ', 'ج']; |
| app/maternity/pregnancy-tracker.tsx | 189 | <Badge label={`الثلث ${trimester === 1 ? 'الأول' : trimester === 2 ? 'الثاني' : 'الثالث'}`} color="#fff" bg="rgba(255,255,255,0.2)" /> |
| app/maternity/pregnancy-tracker.tsx | 202 | <SectionHeader title="حساب ركلات الجنين" /> |
| app/maternity/pregnancy-tracker.tsx | 226 | <Button label="حفظ الجلسة" variant="gradient" loading={savingKicks} onPress={handleSaveKicks} style={{ flex: 1 }}/> |
| app/maternity/pregnancy-tracker.tsx | 247 | <SectionHeader title="مؤقت الانقباضات (الطلق)" /> |
| app/maternity/pregnancy-tracker.tsx | 278 | <SectionHeader title="الفحوصات القادمة" /> |
| app/maternity/pregnancy-tracker.tsx | 289 | {m.done ? <Badge label="تم" color={colors.success} /> : null} |
| app/maternity/pregnancy-tracker.tsx | 295 | <Button label="استشارة طبيب نساء وولادة" variant="gradient" icon="doctor" onPress={() => router.push('/(tabs)/consultations')} /> |
| app/maternity/pregnancy-tracker.tsx | 296 | <Button label="خطة تغذية للحامل" variant="outline" icon="food" onPress={() => router.push('/nutrition/ai-plan-builder')} /> |
| app/mental-health/meditation.tsx | 176 | {[{ num: '12', label: 'جلسة هذا الشهر' }, { num: '3.5h', label: 'وقت التأمل' }, { num: '5', label: 'يوم متتالٍ' }].map((s, i) => ( |
| app/mental-health/meditation.tsx | 193 | <View style={[styles.levelBadge, { backgroundColor: session.level === 'مبتدئ' ? (isDark ? 'rgba(91,168,79,0.15)' : '#DCFCE7') : session.level === 'متوسط' ? (isDark ? 'rgba(240,165,38,0.15)' : '#FEF3C7') : (isDark ? 'rgba(122,107,234,0.15)' : '#EDE9FE') } ]}> |
| app/mental-health/mood-journal.tsx | 20 | const EMOTIONS = ['سعيد', 'هادئ', 'متحمس', 'ممتن', 'متعب', 'قلق', 'محبط', 'وحيد', 'غاضب', 'متوتر', 'مرتاح', 'خائف']; |
| app/mental-health/mood-journal.tsx | 21 | const ACTIVITIES = ['تمرين رياضي', 'تأمل', 'قراءة ', 'مع العائلة ‍‍', 'عمل ', 'نوم جيد ', 'طعام صحي ', 'طبيعة ']; |
| app/mental-health/mood-journal.tsx | 70 | Alert.alert('خطأ', 'تعذر حفظ المزاج'); |
| app/mental-health/mood-journal.tsx | 136 | placeholder="اكتب ما يخطر على بالك..." |
| app/mental-health/therapist-match.tsx | 12 | const CONCERNS = ['قلق وتوتر', 'اكتئاب', 'مشاكل نوم', 'ضغوط العمل', 'مشاكل عائلية', 'إدمان', 'صدمة نفسية', 'ثقة بالنفس', 'اضطرابات أكل', 'حزن وفقدان']; |
| app/mental-health/therapist-match.tsx | 41 | langs: d.languages?.map((l: string) => l === 'ar' ? 'العربية' : 'English') \|\| ['العربية'] |
| app/mental-health/therapist-match.tsx | 71 | <SectionHeader title="ما الذي يشغلك؟ (اختر كل ما ينطبق)" /> |
| app/mental-health/therapist-match.tsx | 83 | <Button label="ابحث عن معالج مناسب" variant="gradient" size="lg" icon="robot" loading={matching} disabled={selected.length === 0} onPress={findMatch} style={{ marginTop: 16 }}/> |
| app/mental-health/therapist-match.tsx | 119 | <Button label="احجز الآن" variant="primary" size="sm" full={false} onPress={() => router.push({ pathname: '/consultations/booking-confirm', params: { doctorId: t.id } })} /> |
| app/nursing/live-doctor-tracking.tsx | 34 | const statusTexts = { coming: 'في الطريق إليك', near: 'قريب جداً — استعد!', arrived: 'وصل إلى موقعك!' }; |
| app/nursing/live-tracking.tsx | 107 | <Text style={{ fontFamily: 'Cairo-Bold', fontSize: 24, color: '#1E293B', marginBottom: 12 }}>اكتملت الزيارة بنجاح</Text> |
| app/nursing/live-tracking.tsx | 108 | <Text style={{ fontFamily: 'Cairo-Medium', fontSize: 16, color: '#64748B', textAlign: 'center', marginBottom: 32 }}>تم رفع التقرير الطبي للزيارة. يمكنك الآن تقييم الممرض والاطلاع على السجل الطبي.</Text> |
| app/nursing/live-tracking.tsx | 111 | <Text style={{ fontFamily: 'Cairo-Bold', fontSize: 16, color: '#1E293B', marginBottom: 16, textAlign: 'right' }}>التقرير السريري للزيارة</Text> |
| app/nursing/live-tracking.tsx | 113 | <Text style={{ fontFamily: 'Cairo-Medium', fontSize: 14, color: '#64748B' }}>النبض (BPM):</Text> |
| app/nursing/live-tracking.tsx | 114 | <Text style={{ fontFamily: 'Cairo-Bold', fontSize: 14, color: '#1E293B' }}>{trackingData.vitals?.pulse ?? 'غير مسجل'}</Text> |
| app/nursing/live-tracking.tsx | 117 | <Text style={{ fontFamily: 'Cairo-Medium', fontSize: 14, color: '#64748B' }}>ضغط الدم:</Text> |
| app/nursing/live-tracking.tsx | 118 | <Text style={{ fontFamily: 'Cairo-Bold', fontSize: 14, color: '#1E293B' }}>{trackingData.vitals?.bp ?? 'غير مسجل'}</Text> |
| app/nursing/live-tracking.tsx | 121 | <Text style={{ fontFamily: 'Cairo-Medium', fontSize: 14, color: '#64748B' }}>ملاحظات الممرض:</Text> |
| app/nursing/live-tracking.tsx | 122 | <Text style={{ fontFamily: 'Cairo-Medium', fontSize: 14, color: '#1E293B', flex: 1, textAlign: 'left' }}>{trackingData.notes ?? 'لا توجد ملاحظات مسجلة.'}</Text> |
| app/nursing/live-tracking.tsx | 127 | <Text style={{ fontFamily: 'Cairo-Bold', fontSize: 16, color: '#fff' }}>تقييم الزيارة والعودة للرئيسية</Text> |
| app/nursing/live-tracking.tsx | 138 | <Text style={{ fontFamily: 'Cairo-Bold', fontSize: 16, color: '#1E293B', marginTop: 12, textAlign: 'center' }}>خريطة الموقع الحي</Text> |
| app/nursing/live-tracking.tsx | 175 | <Text style={styles.etaMin}>{eta === null ? 'غير متاح' : 'دقيقة'}</Text> |
| app/nursing/live-tracking.tsx | 209 | <Text style={styles.infoName}>{trackingData?.nurse_name ?? 'مقدم الخدمة غير متاح'}</Text> |
| app/nursing/live-tracking.tsx | 210 | <Text style={styles.infoSub}>{trackingData?.nurse_title ?? trackingData?.facility_name ?? 'لا توجد بيانات مهنية مؤكدة'}</Text> |
| app/nursing/nurse-profile.tsx | 42 | const [gpsLocation, setGpsLocation] = useState('حي الملقا، الرياض'); |
| app/nursing/nurse-profile.tsx | 47 | const dayNames = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']; |
| app/nursing/nurse-profile.tsx | 61 | const timesArray = ['08:00 ص', '08:30 ص', '09:00 ص', '09:30 ص', '10:00 ص', '10:30 ص', '11:00 ص', '11:30 ص', '12:00 م', '12:30 م', '01:00 م']; |
| app/nursing/nurse-profile.tsx | 128 | <Text style={styles.successTitle}>الطلب قيد المراجعة</Text> |
| app/nursing/nurse-profile.tsx | 129 | <Text style={styles.successDesc}>تم استدعاء بيانات تأمينك وإرسال الطلب لشركة التأمين للحصول على الموافقة الطبية. سنعلمك فور صدور الموافقة.</Text> |
| app/nursing/nurse-profile.tsx | 131 | <Text style={styles.successBtnText}>العودة للرئيسية</Text> |
| app/nursing/nurse-profile.tsx | 149 | <Text style={styles.headerTitle}>حجز الخدمة</Text> |
| app/nursing/nurse-profile.tsx | 165 | <Text style={styles.ratingText}>{nurse.rating} ({nurse.reviews_count} تقييم)</Text> |
| app/nursing/nurse-profile.tsx | 180 | <Text style={styles.sectionTitle}>1. تحديد موعد الزيارة والتكرار</Text> |
| app/nursing/nurse-profile.tsx | 183 | <Text style={styles.label}>اليوم والتاريخ (30 يوماً)</Text> |
| app/nursing/nurse-profile.tsx | 193 | <Text style={styles.label}>الوقت (يومياً)</Text> |
| app/nursing/nurse-profile.tsx | 202 | <Text style={styles.label}>مدة وتكرار الزيارة</Text> |
| app/nursing/nurse-profile.tsx | 210 | <Text style={styles.freqDropdownSub}>قابل للتعديل من 1 إلى 20 يوم</Text> |
| app/nursing/nurse-profile.tsx | 215 | <Text style={styles.sectionTitle}>2. الموقع والمواصلات</Text> |
| app/nursing/nurse-profile.tsx | 221 | <Text style={styles.gpsLabel}>موقع تقديم الخدمة</Text> |
| app/nursing/nurse-profile.tsx | 225 | <TouchableOpacity><Text style={styles.gpsChange}>تغيير</Text></TouchableOpacity> |
| app/nursing/nurse-profile.tsx | 233 | <Text style={styles.transportTitle}>الممرض سيوفر المواصلات (+50 ر.س)</Text> |
| app/nursing/nurse-profile.tsx | 234 | <Text style={styles.transportDesc}>الممرض سيصل إلى موقعك (حي الملقا)</Text> |
| app/nursing/nurse-profile.tsx | 240 | <Text style={styles.transportTitle}>أنا سأوفر المواصلات (0 ر.س)</Text> |
| app/nursing/nurse-profile.tsx | 241 | <Text style={styles.transportDesc}>سأرسل سيارة لإحضار الممرض من (مستشفى دله)</Text> |
| app/nursing/nurse-profile.tsx | 247 | <Text style={styles.sectionTitle}>3. ملخص الدفع ({flow === 'cash' ? 'نقدي' : 'تأمين'})</Text> |
| app/nursing/nurse-profile.tsx | 253 | <Text style={styles.insuranceTitle}>تم جلب التأمين تلقائياً</Text> |
| app/nursing/nurse-profile.tsx | 255 | <Text style={styles.insuranceText}>الشركة: {insuranceData?.provider}</Text> |
| app/nursing/nurse-profile.tsx | 256 | <Text style={styles.insuranceText}>البوليصة: {insuranceData?.policy}</Text> |
| app/nursing/nurse-profile.tsx | 257 | <Text style={styles.insuranceWarning}>* سيتم إرسال الطلب لشركة التأمين للحصول على الموافقة الطبية أولاً.</Text> |
| app/nursing/nurse-profile.tsx | 261 | <View style={styles.billRow}><Text style={styles.billVal}>{basePrice} ر.س</Text><Text style={styles.billLabel}>سعر الزيارة الواحدة</Text></View> |
| app/nursing/nurse-profile.tsx | 262 | <View style={styles.billRow}><Text style={styles.billVal}>{daysCount} أيام</Text><Text style={styles.billLabel}>عدد الأيام</Text></View> |
| app/nursing/nurse-profile.tsx | 263 | {discount > 0 && <View style={styles.billRow}><Text style={[styles.billVal, {color: '#10B981'} ]}>- {discount} ر.س</Text><Text style={styles.billLabel}>خصم الباقة</Text></View>} |
| app/nursing/nurse-profile.tsx | 264 | <View style={styles.billRow}><Text style={styles.billVal}>{transportFee} ر.س</Text><Text style={styles.billLabel}>رسوم الطريق</Text></View> |
| app/nursing/nurse-profile.tsx | 266 | <View style={styles.billRow}><Text style={styles.billTotal}>{finalTotal} ر.س</Text><Text style={styles.billTotalLabel}>الإجمالي المستحق</Text></View> |
| app/nursing/nurse-profile.tsx | 303 | <Text style={styles.modalTitle}>تحديد مدة الرعاية</Text> |
| app/nursing/nurse-profile.tsx | 304 | <Text style={styles.modalSubtitle}>اختر عدد الأيام المتتالية التي سيحضر فيها الممرض.</Text> |
| app/nursing/nurse-profile.tsx | 322 | <Text style={styles.applyBtnText}>إغلاق</Text> |
| app/nursing/service-details.tsx | 53 | const sortLabel = currentSort === 'nearest' ? 'الأقرب أولاً' : (currentSort === 'highest_rated' ? 'الأعلى تقييماً' : 'الكل'); |
| app/nursing/service-details.tsx | 73 | <Text style={styles.heroDesc}>خدمة طبية موثوقة يقدمها طاقم تمريض مرخص وتحت إشراف مباشر من وزارة الصحة.</Text> |
| app/nursing/service-details.tsx | 75 | <Text style={styles.heroMetaText}>استجابة فورية</Text> |
| app/nursing/service-details.tsx | 77 | <Text style={styles.heroMetaText}>تغطية شاملة</Text> |
| app/nursing/service-details.tsx | 82 | <Text style={styles.sectionTitle}>التمريض المتاح للخدمة</Text> |
| app/nursing/service-details.tsx | 113 | <Text style={styles.hospitalText}>{nurse.facility_name \|\| 'مستشفى خاص'}</Text> |
| app/nursing/service-details.tsx | 120 | <Text style={styles.distanceText}>يبعد {nurse.distance_km} كم</Text> |
| app/nursing/service-details.tsx | 126 | <Text style={styles.priceText}>{nurse.price \|\| 150} <Text style={styles.currency}>ر.س</Text></Text> |
| app/nursing/service-details.tsx | 143 | <Text style={styles.selectBtnText}>اختيار</Text> |
| app/nursing/service-details.tsx | 161 | <Text style={styles.resetText}>إعادة ضبط</Text> |
| app/nursing/service-details.tsx | 163 | <Text style={styles.modalTitle}>ترتيب الممرضين حسب</Text> |
| app/nursing/service-details.tsx | 167 | <Text style={[styles.sortOptionText, currentSort === 'nearest' && styles.sortOptionTextActive]} >الأقرب أولاً</Text> |
| app/nursing/service-details.tsx | 174 | <Text style={[styles.sortOptionText, currentSort === 'highest_rated' && styles.sortOptionTextActive]} >الأعلى تقييماً</Text> |
| app/nursing/service-details.tsx | 179 | <Text style={styles.closeBtnText}>إغلاق</Text> |
| app/nursing/service-details.tsx | 193 | <Text style={{ fontFamily: 'Cairo-Bold', fontSize: 18, color: '#0F172A', textAlign: 'center', marginBottom: 12 }}>سياسة الحقن والمحاليل الوريدية</Text> |
| app/nursing/service-details.tsx | 195 | لضمان سلامتك، يشترط الممرض رؤية <Text style={{ color: '#EF4444', fontFamily: 'Cairo-Bold' }}>وصفة طبية معتمدة</Text> قبل إعطاء أي حقن أو محاليل وريدية. لن يتم تقديم الخدمة بدون وصفة، وقد يتم احتساب رسوم الإلغاء. |
| app/nursing/service-details.tsx | 206 | <Text style={{ fontFamily: 'Cairo-Bold', color: '#fff', fontSize: 15 }}>أوافق وأمتلك وصفة</Text> |
| app/nursing/service-details.tsx | 212 | <Text style={{ fontFamily: 'Cairo-Bold', color: '#64748B', fontSize: 15 }}>تراجع</Text> |
| app/nutrition/ai-meal-planner.tsx | 36 | const [selectedDay, setSelectedDay] = useState('السبت'); |
| app/nutrition/ai-meal-planner.tsx | 66 | meal: m.time.split(' ')[0] \|\| 'وجبة', |
| app/nutrition/ai-meal-planner.tsx | 72 | ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'].forEach(day => { |
| app/nutrition/ai-meal-planner.tsx | 93 | {['تحليل المؤشرات الصحية', 'حساب الاحتياجات الغذائية', 'اختيار الوجبات المناسبة', 'توازن المغذيات الكبرى'].map((s, i) => ( |
| app/nutrition/ai-meal-planner.tsx | 143 | {Object.keys(weeklyPlan).concat(['السبت', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة']).map(day => ( |
| app/nutrition/ai-plan-builder.tsx | 20 | const DIETS = ['عادي', 'نباتي', 'كيتو', 'منخفض الكربوهيدرات', 'خالي من الجلوتين', 'حلال فقط']; |
| app/nutrition/ai-plan-builder.tsx | 30 | const [diet, setDiet] = useState('عادي'); |
| app/nutrition/ai-plan-builder.tsx | 71 | Alert.alert('خطأ', 'فشل إنشاء الخطة الغذائية. يرجى المحاولة لاحقاً.'); |
| app/nutrition/ai-plan-builder.tsx | 95 | <SectionHeader title="اختر هدفك" /> |
| app/nutrition/ai-plan-builder.tsx | 111 | <SectionHeader title="بيانات الجسم" /> |
| app/nutrition/ai-plan-builder.tsx | 112 | <SegmentedControl value={gender} onChange={setGender} options={[{ key: 'male', label: 'ذكر' }, { key: 'female', label: 'أنثى' }]} /> |
| app/nutrition/ai-plan-builder.tsx | 114 | <Input value={form.weight} onChangeText={v => set('weight', v)} placeholder="الوزن (كغ)" keyboardType="numeric" icon="weight" style={{ flex: 1 }} /> |
| app/nutrition/ai-plan-builder.tsx | 115 | <Input value={form.height} onChangeText={v => set('height', v)} placeholder="الطول (سم)" keyboardType="numeric" icon="trending_up" style={{ flex: 1 }} /> |
| app/nutrition/ai-plan-builder.tsx | 118 | <Input value={form.age} onChangeText={v => set('age', v)} placeholder="العمر" keyboardType="numeric" icon="calendar" style={{ flex: 1 }} /> |
| app/nutrition/ai-plan-builder.tsx | 119 | <Input value={form.targetWeight} onChangeText={v => set('targetWeight', v)} placeholder="الوزن المستهدف" keyboardType="numeric" icon="success" style={{ flex: 1 }} /> |
| app/nutrition/ai-plan-builder.tsx | 122 | <SectionHeader title="مستوى النشاط" /> |
| app/nutrition/ai-plan-builder.tsx | 127 | <Button label="التالي" variant="gradient" size="lg" onPress={() => setStep(2)} style={{ marginTop: 16 }} /> |
| app/nutrition/ai-plan-builder.tsx | 134 | <SectionHeader title="تفضيلات غذائية" /> |
| app/nutrition/ai-plan-builder.tsx | 143 | <Input value={allergies} onChangeText={setAllergies} placeholder="حساسية أو أطعمة ممنوعة (اختياري)" icon="warning" /> |
| app/nutrition/ai-plan-builder.tsx | 145 | <Button label="إنشاء الخطة بالـ AI" variant="gradient" size="lg" icon="robot" loading={generating} onPress={generate} style={{ marginTop: 16 }}/> |
| app/nutrition/ai-plan-builder.tsx | 161 | <SectionHeader title="الهدف اليومي" /> |
| app/nutrition/ai-plan-builder.tsx | 194 | <Button label="حفظ الخطة" variant="gradient" size="lg" icon="download" onPress={() => router.push('/nutrition/nutrition-plan')} /> |
| app/nutrition/ai-plan-builder.tsx | 195 | <Button label="إنشاء خطة تمارين مناسبة" variant="outline" icon="run" onPress={() => router.push('/nutrition/exercise-plan')} /> |
| app/nutrition/body-composition.tsx | 147 | label="تحديد هدف جديد" |
| app/nutrition/body-composition.tsx | 153 | label="إنشاء خطة مخصصة" |
| app/nutrition/body-target.tsx | 24 | const bmiStatus = bmiNum < 18.5 ? 'نحيف' : bmiNum < 25 ? 'طبيعي' : bmiNum < 30 ? 'زيادة وزن' : 'سمنة'; |
| app/nutrition/body-target.tsx | 50 | Alert.alert('تم الحفظ', 'تم تحديث بياناتك الجسمانية بنجاح'); |
| app/nutrition/body-target.tsx | 52 | Alert.alert('خطأ', 'تعذر حفظ البيانات'); |
| app/nutrition/body-target.tsx | 68 | <SegmentedControl value={gender} onChange={setGender} options={[{ key: 'male', label: 'ذكر' }, { key: 'female', label: 'أنثى' }]} /> |
| app/nutrition/body-target.tsx | 71 | <Input value={weight} onChangeText={setWeight} placeholder="الوزن (كغ)" keyboardType="numeric" icon="weight" style={{ flex: 1 }}/> |
| app/nutrition/body-target.tsx | 72 | <Input value={height} onChangeText={setHeight} placeholder="الطول (سم)" keyboardType="numeric" icon="trending_up" style={{ flex: 1 }}/> |
| app/nutrition/body-target.tsx | 81 | <Badge label={loading ? 'جاري التحميل' : bmiStatus} color={bmiColor} /> |
| app/nutrition/body-target.tsx | 83 | {[{ l: 'نحيف', c: '#F0A526' }, { l: 'طبيعي', c: '#16A34A' }, { l: 'زيادة', c: '#F0A526' }, { l: 'سمنة', c: '#F0695C' }].map((s, i) => ( |
| app/nutrition/body-target.tsx | 91 | <SectionHeader title="الوزن المستهدف" /> |
| app/nutrition/body-target.tsx | 92 | <Input value={targetWeight} onChangeText={setTargetWeight} placeholder="الوزن المستهدف (كغ)" keyboardType="numeric" icon="success" /> |
| app/nutrition/body-target.tsx | 103 | <Button label={saving ? 'جاري الحفظ...' : 'حفظ بياناتي'} variant="gradient" size="lg" icon="success" onPress={handleSave} /> |
| app/nutrition/body-target.tsx | 104 | <Button label="إنشاء خطة غذائية" variant="outline" icon="robot" onPress={() => router.push('/nutrition/ai-plan-builder')} /> |
| app/nutrition/body-target.tsx | 105 | <Button label="عرض هيكل الجسم" variant="outline" icon="user" onPress={() => router.push('/nutrition/body-composition')} /> |
| app/nutrition/calorie-analyzer.tsx | 44 | Alert.alert("خطأ", "فشل تحليل الوجبة. يرجى المحاولة لاحقاً."); |
| app/nutrition/calorie-analyzer.tsx | 110 | placeholder="مثال: كبسة لحم مع سلطة وزبادي..." |
| app/nutrition/calorie-analyzer.tsx | 118 | label="تحليل بالنص" |
| app/nutrition/calorie-analyzer.tsx | 127 | label="صوّر الأكل" |
| app/nutrition/calorie-analyzer.tsx | 162 | <SectionHeader title="القيم الغذائية" /> |
| app/nutrition/calorie-analyzer.tsx | 186 | <SectionHeader title="الفيتامينات والمعادن" /> |
| app/nutrition/calorie-analyzer.tsx | 202 | <SectionHeader title="نصائح AI" /> |
| app/nutrition/calorie-analyzer.tsx | 225 | label="إضافة للسجل اليومي" |
| app/nutrition/daily-tracker.tsx | 51 | } catch { Alert.alert('خطأ', 'تعذر تسجيل الماء'); } |
| app/nutrition/daily-tracker.tsx | 94 | <SectionHeader title="الوجبات" /> |
| app/nutrition/daily-tracker.tsx | 121 | <SectionHeader title="الماء" /> |
| app/nutrition/daily-tracker.tsx | 137 | {[{ label: 'كوب (250)', ml: 250 }, { label: 'قنينة (500)', ml: 500 }].map(s => ( |
| app/nutrition/daily-tracker.tsx | 160 | <Button label="تحليل وجبة بالـ AI" variant="outline" icon="robot" onPress={() => router.push('/nutrition/calorie-analyzer')} /> |
| app/nutrition/exercise-plan.tsx | 30 | <Button label="العودة" variant="outline" onPress={() => router.back()} style={styles.cta} /> |
| app/nutrition/food-scanner.tsx | 58 | suggestion: res.suggestions?.[0] \|\| 'وجبة مغذية غنية بالبروتينات والعناصر الهامة.', |
| app/nutrition/log-meal.tsx | 65 | Alert.alert('خطأ', 'تعذر حفظ الوجبة. تأكد من اتصالك بالإنترنت.'); |
| app/nutrition/log-meal.tsx | 139 | placeholder="ابحث عن طعام..." placeholderTextColor={colors.textTertiary} textAlign="right" /> |
| app/nutrition/water-tracker.tsx | 53 | Alert.alert('خطأ', 'تعذر تسجيل الماء. تأكد من اتصالك بالإنترنت.'); |
| app/nutrition/water-tracker.tsx | 149 | {['ابدأ يومك بكوب ماء فور الاستيقاظ', 'اشرب كوباً قبل كل وجبة', 'احمل قنينة ماء معك دائماً'].map((tip, i) => ( |
| app/offers/[id].tsx | 112 | <Badge label="ممول" color="#fff" bg="rgba(239,68,68,0.9)" style={{ marginBottom: 6 }}/> |
| app/offers/[id].tsx | 130 | <Badge label={`وفر ${offer.originalPrice - offer.discountedPrice} ر.س`} color={colors.success} /> |
| app/offers/[id].tsx | 146 | <SectionHeader title="مشتملات الباقة" /> |
| app/offers/[id].tsx | 176 | <SectionHeader title="الشروط والأحكام" /> |
| app/offers/[id].tsx | 190 | <Button label="احجز العرض الآن" variant="gradient" size="lg" icon="calendarCheck" onPress={handleBook} /> |
| app/payments/failure.tsx | 63 | label="إعادة المحاولة" |
| app/payments/failure.tsx | 69 | label="تغيير طريقة الدفع" |
| app/payments/failure.tsx | 75 | label="العودة للرئيسية" |
| app/payments/processing.tsx | 38 | const [statusText, setStatusText] = useState('جاري معالجة الدفع...'); |
| app/payments/processing.tsx | 377 | label="تحقق من حالة الدفع" |
| app/payments/processing.tsx | 384 | label="إلغاء العملية" |
| app/payments/success.tsx | 28 | const serviceName = params.serviceName as string \|\| 'الخدمة'; |
| app/pharmacy/barcode-scanner.tsx | 54 | <Button label="السماح بالكاميرا" variant="outline" icon="photo_camera" onPress={requestPermission} style={{ marginTop: 20, borderColor: 'rgba(255,255,255,0.4)' }}/> |
| app/pharmacy/barcode-scanner.tsx | 91 | <Badge label="دواء موثق" color={colors.success} /> |
| app/pharmacy/barcode-scanner.tsx | 92 | {result.requiresRx && <Badge label="يتطلب وصفة" color={colors.warning} />} |
| app/pharmacy/barcode-scanner.tsx | 101 | <Button label="عرض التفاصيل وإضافة للسلة" variant="gradient" icon="shopping_cart" onPress={handleAddToCart} /> |
| app/pharmacy/barcode-scanner.tsx | 102 | <Button label="مسح دواء آخر" variant="outline" icon="qr_code_scanner" onPress={() => { setScanning(true); setResult(null); }} /> |
| app/pharmacy/barcode-scanner.tsx | 109 | <Button label="المسح مرة أخرى" variant="outline" icon="qr_code_scanner" onPress={() => { setScanning(true); setErrorMessage(null); }} /> |
| app/pharmacy/cart.tsx | 33 | Alert.alert('إذن مطلوب', 'نحتاج إذن الوصول للمعرض لرفع صورة الروشتة'); |
| app/pharmacy/cart.tsx | 49 | Alert.alert('إذن مطلوب', 'نحتاج إذن الكاميرا لتصوير الروشتة'); |
| app/pharmacy/cart.tsx | 71 | <Text style={[styles.emptyTitle, { color: colors.n } ]}>السلة فارغة</Text> |
| app/pharmacy/cart.tsx | 72 | <Text style={[styles.emptySubtitle, { color: colors.t2 } ]}>لم تقم بإضافة أي أدوية للسلة بعد</Text> |
| app/pharmacy/cart.tsx | 74 | <Text style={{ fontFamily: 'Cairo-Bold', fontSize: 15, color: '#fff' }}>تصفح الأدوية</Text> |
| app/pharmacy/cart.tsx | 88 | <Text style={[styles.headerTitle, { color: colors.n } ]}>سلة الطلبات ({items.length})</Text> |
| app/pharmacy/cart.tsx | 89 | <TouchableOpacity onPress={() => { Alert.alert('تفريغ السلة', 'هل تريد إزالة كل الأصناف؟', [{ text: 'إلغاء' }, { text: 'تفريغ', onPress: clearCart, style: 'destructive' }]); }} style={[styles.iconBtn, { backgroundColor: colors.s } ]}> |
| app/pharmacy/cart.tsx | 116 | <Text style={[styles.itemPrice, { color: '#23B5CE' } ]}>{(item.price * item.qty).toFixed(2)} ر.س</Text> |
| app/pharmacy/cart.tsx | 165 | <Text style={{ fontFamily: 'Cairo-Bold', color: '#fff', fontSize: 15 }}>صوّر الروشتة الآن</Text> |
| app/pharmacy/cart.tsx | 172 | <Text style={{ fontFamily: 'Cairo-Bold', color: '#23B5CE', fontSize: 15 }}>ارفع من المعرض</Text> |
| app/pharmacy/cart.tsx | 179 | <Text style={{ fontFamily: 'Cairo-Bold', color: '#7A6BEA', fontSize: 15 }}>استشارة طبيب للحصول عليها</Text> |
| app/pharmacy/cart.tsx | 187 | <Text style={{ fontFamily: 'Cairo-Bold', color: '#F0695C', fontSize: 14 }}>حذف الوصفة وإعادة الرفع</Text> |
| app/pharmacy/cart.tsx | 200 | <Text style={{ fontFamily: 'Cairo-Bold', color: '#23B5CE', fontSize: 15 }}>لم تجد دواءك؟ أضف صنف يدوياً</Text> |
| app/pharmacy/cart.tsx | 208 | <Text style={[styles.totalLabel, { color: colors.t2 } ]}>المجموع التقديري</Text> |
| app/pharmacy/cart.tsx | 209 | <Text style={[styles.totalValue, { color: colors.n } ]}>{subtotal.toFixed(2)} <Text style={{ fontSize: 14, color: colors.t3 }}>ر.س</Text></Text> |
| app/pharmacy/chat-with-pharmacist.tsx | 154 | Alert.alert('قبول البدائل', 'تم إرسال طلب قبول الأدوية البديلة المقترحة بنجاح.'); |
| app/pharmacy/chat-with-pharmacist.tsx | 164 | Alert.alert('حذف الأدوية غير المتوفرة', 'تم تحديث سلة الشراء وحذف الأصناف غير المتوفرة.'); |
| app/pharmacy/chat-with-pharmacist.tsx | 174 | Alert.alert('إلغاء الطلب', 'تم إلغاء الطلب الحالي.'); |
| app/pharmacy/chat-with-pharmacist.tsx | 288 | label="العودة للصيدلية" |
| app/pharmacy/chat-with-pharmacist.tsx | 302 | placeholder="اكتب رسالتك للصيدلي..." |
| app/pharmacy/checkout.tsx | 85 | Alert.alert('السلة فارغة', 'أضف الأصناف المطلوبة قبل إرسال الطلب.'); |
| app/pharmacy/checkout.tsx | 89 | Alert.alert('عنوان التوصيل مطلوب', 'اختر عنواناً محفوظاً يتضمن الموقع قبل إرسال الطلب.'); |
| app/pharmacy/checkout.tsx | 118 | Alert.alert('خطأ', 'حدث خطأ أثناء تأكيد الطلب، يرجى المحاولة مجدداً'); |
| app/pharmacy/checkout.tsx | 132 | <Text style={[styles.headerTitle, { color: colors.n } ]}>إتمام الطلب</Text> |
| app/pharmacy/checkout.tsx | 139 | <Text style={[styles.sectionTitle, { color: colors.n, textAlign: isRTL ? 'right' : 'left' } ]}>طريقة الاستلام</Text> |
| app/pharmacy/checkout.tsx | 171 | <Text style={{ fontFamily: 'Cairo-Bold', fontSize: 15, color: colors.n }}>{userAddress.label \|\| 'عنوان التوصيل'}</Text> |
| app/pharmacy/checkout.tsx | 177 | <Text style={{ fontFamily: 'Cairo-Bold', fontSize: 13, color: '#23B5CE' }}>تغيير</Text> |
| app/pharmacy/checkout.tsx | 184 | <Text style={[styles.sectionTitle, { color: colors.n, textAlign: isRTL ? 'right' : 'left' } ]}>طريقة الدفع</Text> |
| app/pharmacy/checkout.tsx | 215 | <Text style={[styles.sectionTitle, { color: colors.n, textAlign: isRTL ? 'right' : 'left' } ]}>ملخص الطلب</Text> |
| app/pharmacy/checkout.tsx | 229 | <Text style={{ fontFamily: 'Cairo-Regular', fontSize: 13, color: colors.t2 }}>رسوم التوصيل</Text> |
| app/pharmacy/checkout.tsx | 235 | <Text style={{ fontFamily: 'Cairo-Black', fontSize: 16, color: colors.n }}>الإجمالي النهائي</Text> |
| app/pharmacy/checkout.tsx | 236 | <Text style={{ fontFamily: 'Cairo-Bold', fontSize: 13, color: colors.t2 }}>يظهر بعد اختيار العرض</Text> |
| app/pharmacy/checkout.tsx | 255 | <Text style={{ fontFamily: 'Cairo-Black', color: '#fff', fontSize: 16 }}>إرسال الطلب للصيدليات</Text> |
| app/pharmacy/custom-item.tsx | 204 | placeholder="أي معلومات إضافية..." |
| app/pharmacy/drug-not-found.tsx | 61 | <Button label="العودة للصيدلية" variant="gradient" icon="medication" onPress={() => router.replace('/(tabs)/pharmacy')} style={{ marginTop: 16, width: '80%' }} /> |
| app/pharmacy/drug-not-found.tsx | 62 | <Button label="إضافة دواء آخر" variant="outline" icon="add" onPress={() => { setSent(false); setName(''); setDose(''); setHasImage(false); }} style={{ width: '80%' }} /> |
| app/pharmacy/drug-not-found.tsx | 89 | <SectionHeader title="بيانات الدواء" /> |
| app/pharmacy/drug-not-found.tsx | 91 | <Input value={name} onChangeText={setName} placeholder="اسم الدواء *" icon="medication" /> |
| app/pharmacy/drug-not-found.tsx | 92 | <Input value={dose} onChangeText={setDose} placeholder="التركيز / الجرعة (مثال: 500mg)" icon="edit" /> |
| app/pharmacy/drug-not-found.tsx | 94 | <Input value={qty} onChangeText={v => setQty(v.replace(/\D/g, ''))} placeholder="الكمية" keyboardType="numeric" icon="shopping_cart" style={{ flex: 1 }} /> |
| app/pharmacy/drug-not-found.tsx | 97 | <Input value={notes} onChangeText={setNotes} placeholder="ملاحظات إضافية (اختياري)" icon="edit" multiline /> |
| app/pharmacy/drug-not-found.tsx | 103 | <SectionHeader title="صورة الدواء أو العلبة (اختياري)" /> |
| app/pharmacy/drug-not-found.tsx | 113 | <Badge label="تم رفع الصورة" color={colors.success} icon="check_circle" /> |
| app/pharmacy/drug-not-found.tsx | 123 | <SectionHeader title="ماذا سيحدث؟" /> |
| app/pharmacy/drug-not-found.tsx | 141 | <Button label="إرسال للصيدلية" variant="gradient" size="lg" icon="send" loading={sending} disabled={!name.trim()} onPress={handleSubmit} /> |
| app/pharmacy/filters.tsx | 80 | setCategoriesData([{ id: 'all', label: 'الكل', icon: 'apps', color: '#23B5CE' }, ...mapped]); |
| app/pharmacy/filters.tsx | 151 | <Text style={{ fontSize: 17, fontFamily: 'Cairo-Bold', color: colors.n }}>تصفية النتائج</Text> |
| app/pharmacy/filters.tsx | 154 | <Text style={{ fontSize: 11, color: '#fff', fontWeight: '700' }}>{activeCount} فلتر نشط</Text> |
| app/pharmacy/filters.tsx | 160 | <Text style={{ fontSize: 13, fontFamily: 'Cairo-SemiBold', color: p }}>إعادة تعيين</Text> |
| app/pharmacy/filters.tsx | 170 | <SectionTitle title="ترتيب حسب" /> |
| app/pharmacy/filters.tsx | 193 | <SectionTitle title="التصنيف" /> |
| app/pharmacy/filters.tsx | 244 | <SectionTitle title="نطاق السعر (ر.س)" /> |
| app/pharmacy/filters.tsx | 248 | placeholder="الحد الأدنى" |
| app/pharmacy/filters.tsx | 258 | placeholder="الحد الأقصى" |
| app/pharmacy/filters.tsx | 270 | <SectionTitle title="الشكل الدوائي" /> |
| app/pharmacy/filters.tsx | 293 | <SectionTitle title="الشركة المصنعة" /> |
| app/pharmacy/filters.tsx | 297 | placeholder="ابحث عن شركة..." |
| app/pharmacy/manual-order.tsx | 60 | <Text style={{ fontFamily: 'Cairo-Black', fontSize: 18, color: colors.n }}>طلب دواء غير متوفر</Text> |
| app/pharmacy/manual-order.tsx | 68 | <Text style={{ fontFamily: 'Cairo-Black', fontSize: 16, color: '#141A2A', marginBottom: 4, textAlign: 'center' }}>هنوفره لك بأسرع وقت</Text> |
| app/pharmacy/manual-order.tsx | 75 | <Text style={[styles.label, { color: colors.n, textAlign: isRTL ? 'right' : 'left' } ]}>اسم الدواء <Text style={{ color: '#F0695C' }}>*</Text></Text> |
| app/pharmacy/manual-order.tsx | 78 | placeholder="مثال: كونجستال أقراص" |
| app/pharmacy/manual-order.tsx | 84 | <Text style={[styles.label, { color: colors.n, textAlign: isRTL ? 'right' : 'left' } ]}>ملاحظات أو تركيز الدواء (اختياري)</Text> |
| app/pharmacy/manual-order.tsx | 87 | placeholder="أضف أي تفاصيل أخرى تساعد الصيدلي..." |
| app/pharmacy/manual-order.tsx | 95 | <Text style={[styles.label, { color: colors.n, textAlign: isRTL ? 'right' : 'left', marginTop: 8 } ]}>صورة الدواء أو الروشتة (اختياري)</Text> |
| app/pharmacy/manual-order.tsx | 106 | <Text style={{ fontFamily: 'Cairo-Bold', fontSize: 14, color: '#23B5CE' }}>اضغط لرفع صورة الدواء</Text> |
| app/pharmacy/manual-order.tsx | 118 | <Text style={{ fontFamily: 'Cairo-Black', fontSize: 16, color: medName.length > 2 ? '#fff' : colors.t3 }}>أضف للسلة</Text> |
| app/pharmacy/medicine-compare.tsx | 89 | const val = m[mappedKey as keyof typeof m] \|\| m[row.key as keyof typeof m] \|\| 'غير متوفر'; |
| app/pharmacy/order-confirm.tsx | 75 | <Text style={{ fontFamily: 'Cairo-Regular', color: colors.t2, marginTop: 16 }}>جاري تحميل تفاصيل الطلب...</Text> |
| app/pharmacy/order-confirm.tsx | 83 | <Text style={{ fontFamily: 'Cairo-Bold', color: colors.n, textAlign: 'center' }}>{errorMessage \|\| 'تعذر تحميل تفاصيل الطلب.'}</Text> |
| app/pharmacy/order-confirm.tsx | 85 | <Text style={{ fontFamily: 'Cairo-Bold', color: '#fff' }}>العودة</Text> |
| app/pharmacy/order-confirm.tsx | 99 | <Text style={[styles.headerTitle, { color: colors.n } ]}>تأكيد الطلب</Text> |
| app/pharmacy/order-confirm.tsx | 128 | <Text style={[styles.sectionTitle, { color: colors.n, textAlign: isRTL ? 'right' : 'left' } ]}>الأصناف</Text> |
| app/pharmacy/order-confirm.tsx | 134 | <Text style={{ fontFamily: 'Cairo-Regular', fontSize: 12, color: colors.t2 }}>الكمية: {item.qty}</Text> |
| app/pharmacy/order-confirm.tsx | 136 | <Text style={{ fontFamily: 'Cairo-Black', fontSize: 15, color: '#23B5CE' }}>{(item.price * item.qty).toFixed(2)} ر.س</Text> |
| app/pharmacy/order-confirm.tsx | 144 | <Text style={{ fontFamily: 'Cairo-Bold', fontSize: 14, color: '#141A2A' }}>بعض الأصناف غير متوفرة</Text> |
| app/pharmacy/order-confirm.tsx | 154 | <Text style={{ fontFamily: 'Cairo-Regular', fontSize: 14, color: colors.t2 }}>المجموع</Text> |
| app/pharmacy/order-confirm.tsx | 155 | <Text style={{ fontFamily: 'Cairo-Bold', fontSize: 14, color: colors.n }}>{order.subtotal?.toFixed(2)} ر.س</Text> |
| app/pharmacy/order-confirm.tsx | 158 | <Text style={{ fontFamily: 'Cairo-Regular', fontSize: 14, color: colors.t2 }}>التوصيل</Text> |
| app/pharmacy/order-confirm.tsx | 159 | <Text style={{ fontFamily: 'Cairo-Bold', fontSize: 14, color: colors.n }}>{order.delivery_fee} ر.س</Text> |
| app/pharmacy/order-confirm.tsx | 163 | <Text style={{ fontFamily: 'Cairo-Black', fontSize: 17, color: colors.n }}>الإجمالي النهائي</Text> |
| app/pharmacy/order-confirm.tsx | 164 | <Text style={{ fontFamily: 'Cairo-Black', fontSize: 20, color: '#23B5CE' }}>{order.total?.toFixed(2)} ر.س</Text> |
| app/pharmacy/order-confirm.tsx | 182 | <Text style={{ fontFamily: 'Cairo-Black', color: '#fff', fontSize: 16 }}>قبول والمتابعة للدفع</Text> |
| app/pharmacy/order-confirm.tsx | 191 | <Text style={{ fontFamily: 'Cairo-Bold', fontSize: 14, color: colors.t2 }}>رفض والبحث عن صيدلية أخرى</Text> |
| app/pharmacy/order-history.tsx | 126 | <Text style={[styles.title, { color: colors.n }]}>سجل طلباتي</Text> |
| app/pharmacy/order-tracking.tsx | 82 | const pharmacyName = orderData?.pharmacy_name ?? 'غير متاح'; |
| app/pharmacy/order-tracking.tsx | 83 | const estimatedTime = orderData?.estimated_arrival ?? 'غير متاح'; |
| app/pharmacy/order-tracking.tsx | 89 | <Text style={{ fontFamily: 'Cairo-Bold', color: colors.n, textAlign: 'center' }}>{errorMessage \|\| 'تعذر تحميل تتبع الطلب.'}</Text> |
| app/pharmacy/order-tracking.tsx | 91 | <Text style={{ fontFamily: 'Cairo-Bold', color: '#fff' }}>العودة</Text> |
| app/pharmacy/order-tracking.tsx | 108 | <Text style={[styles.headerTitle, { color: colors.n } ]}>تتبع الطلب {orderNum}</Text> |
| app/pharmacy/order-tracking.tsx | 123 | <Text style={{ fontFamily: 'Cairo-Regular', fontSize: 12, color: '#4C5566' }}>الوقت المتوقع: {estimatedTime}</Text> |
| app/pharmacy/order-tracking.tsx | 185 | <Text style={{ fontFamily: 'Cairo-Bold', fontSize: 15, color: colors.n, marginBottom: 14, textAlign: isRTL ? 'right' : 'left' }}>تفاصيل الطلب</Text> |
| app/pharmacy/order-tracking.tsx | 223 | <Text style={{ fontFamily: 'Cairo-Black', fontSize: 18, color: '#F0695C', marginBottom: 10 }}>حدث خطأ غير متوقع</Text> |
| app/pharmacy/order-tracking.tsx | 224 | <Text style={{ fontFamily: 'Cairo-Regular', fontSize: 14, color: '#4C5566', textAlign: 'center', marginBottom: 20 }}>{error?.message \|\| 'تعذر تحميل الصفحة'}</Text> |
| app/pharmacy/order-tracking.tsx | 226 | <Text style={{ fontFamily: 'Cairo-Bold', color: '#fff', fontSize: 15 }}>إعادة المحاولة</Text> |
| app/pharmacy/payment.tsx | 60 | Alert.alert('الدفع غير متاح', 'انتظر اعتماد عرض الصيدلية والسعر النهائي قبل الدفع.'); |
| app/pharmacy/payment.tsx | 76 | Alert.alert('تعذر بدء الدفع', 'لم يتم تأكيد أي عملية دفع. تحقق من الاتصال وحالة الطلب ثم أعد المحاولة.'); |
| app/pharmacy/payment.tsx | 92 | <Text style={[styles.headerTitle, { color: colors.n } ]}>إتمام الدفع</Text> |
| app/pharmacy/payment.tsx | 105 | {amountToPay !== null && <Text style={{ fontSize: 18, color: '#4C5566' }}> ر.س</Text>} |
| app/pharmacy/payment.tsx | 113 | <Text style={[styles.sectionTitle, { color: colors.n, textAlign: isRTL ? 'right' : 'left' } ]}>اختر طريقة الدفع</Text> |
| app/pharmacy/payment.tsx | 162 | <Text style={{ fontFamily: 'Cairo-Black', color: '#fff', fontSize: 16 }}>الانتقال إلى بوابة الدفع</Text> |
| app/pharmacy/pharmacist-chat.tsx | 74 | const newMsg = { id: Date.now(), sender: "me", text: msg, time: "الآن", status: isConnected ? "sent" : "pending" }; |
| app/pharmacy/pharmacist-chat.tsx | 318 | <Text style={{ fontSize: 11, color: colors.t3, marginHorizontal: 8, fontStyle: 'italic' }}>يكتب الآن...</Text> |
| app/pharmacy/pharmacist-chat.tsx | 342 | placeholder="اكتب رسالتك للصيدلي..." |
| app/pharmacy/product-detail.tsx | 126 | [{ text: isRTL ? 'موافق' : 'OK' }] |
| app/pharmacy/product-detail.tsx | 166 | const seoTitle = `${name} \| ${med.active_ingredient \|\| ''} \| صيدلية نبض`; |
| app/pharmacy/product-detail.tsx | 238 | <Text style={[styles.currency, { color: '#F0695C' } ]}>ر.س</Text> |
| app/pharmacy/product-detail.tsx | 243 | <Text style={{ fontFamily: 'Cairo-Bold', color: '#F0695C', fontSize: 11 }}>{isRTL ? 'وصفة طبية' : 'Prescription'}</Text> |
| app/pharmacy/product-detail.tsx | 251 | {med.form && <InfoPill icon="category" pillTitle={isRTL ? "النوع" : "Form"} label={med.form} colors={colors} tint="#7A6BEA" bg={isDark ? '#2D2A4A' : '#EBE8FC'} isRTL={isRTL} />} |
| app/pharmacy/product-detail.tsx | 252 | {med.strength && <InfoPill icon="scale" pillTitle={isRTL ? "التركيز" : "Strength"} label={med.strength} colors={colors} tint="#F0A526" bg={isDark ? '#4A3515' : '#FEF6E8'} isRTL={isRTL} />} |
| app/pharmacy/product-detail.tsx | 253 | {med.active_ingredient && <InfoPill icon="science" pillTitle={isRTL ? "المادة الفعالة" : "Active Ingredient"} label={med.active_ingredient} colors={colors} tint="#2BB89C" bg={isDark ? '#153A33' : '#E8F8F5'} isRTL={isRTL} />} |
| app/pharmacy/product-detail.tsx | 260 | <Text style={[styles.sectionTitle, { color: colors.n } ]}>{isRTL ? 'بدائل مقترحة (نفس المادة الفعالة)' : 'Alternatives'}</Text> |
| app/pharmacy/product-detail.tsx | 272 | <Text style={[styles.altPrice, { color: '#23B5CE' } ]}>{(alt.price \|\| 0).toFixed(2)} ر.س</Text> |
| app/pharmacy/product-detail.tsx | 282 | <DetailAccordion title={isRTL ? "الوصف والتفاصيل" : "Description"} icon="info" content={description \|\| med.d} colors={colors} isRTL={isRTL} defaultOpen={true} /> |
| app/pharmacy/product-detail.tsx | 283 | <DetailAccordion title={isRTL ? "الجرعة وطريقة الاستخدام" : "Dosage & Usage"} icon="medication" content={dosage} colors={colors} isRTL={isRTL} /> |
| app/pharmacy/product-detail.tsx | 284 | <DetailAccordion title={isRTL ? "الأعراض الجانبية" : "Side Effects"} icon="sick" content={sideEffects} colors={colors} isRTL={isRTL} /> |
| app/pharmacy/product-detail.tsx | 285 | <DetailAccordion title={isRTL ? "تحذيرات وموانع الاستخدام" : "Warnings & Precautions"} icon="warning" content={warnings} colors={colors} isRTL={isRTL} isWarning={true} /> |
| app/pharmacy/product-detail.tsx | 311 | <Text style={{ fontFamily: 'Cairo-Black', color: '#fff', fontSize: 16 }}>{isRTL ? 'أضف إلى السلة' : 'Add to Cart'}</Text> |
| app/pharmacy/reorder.tsx | 123 | <Button label="إضافة أصناف جديدة" variant="outline" icon="add" onPress={() => router.push('/(tabs)/pharmacy')} /> |
| app/pharmacy/reorder.tsx | 127 | <SectionHeader title="طريقة الاستلام" /> |
| app/pharmacy/reorder.tsx | 133 | <Input value={address} onChangeText={setAddress} placeholder="عنوان التوصيل" icon="location" style={{ marginTop: 10 }}/> |
| app/pharmacy/reorder.tsx | 139 | <SectionHeader title="طريقة الدفع" /> |
| app/pharmacy/reorder.tsx | 158 | <Button label="تأكيد إعادة الطلب" variant="gradient" size="lg" icon="shopping_cart" loading={loading} onPress={handleOrder} /> |
| app/pharmacy/rx-order.tsx | 89 | <SectionHeader title="الأدوية الموصوفة" /> |
| app/pharmacy/rx-order.tsx | 100 | {med.requiresRx && <Badge label="يحتاج وصفة" color="#F0695C" />} |
| app/pharmacy/rx-order.tsx | 114 | <SectionHeader title="المستندات المطلوبة للتأمين" /> |
| app/pharmacy/rx-order.tsx | 141 | <Button label="ليس لديك وصفة؟ استشر طبيب" variant="ghost" icon="doctor" onPress={() => router.push('/(tabs)/consultations')} style={{ marginTop: 6 }} /> |
| app/pharmacy/rx-order.tsx | 151 | <SectionHeader title="طريقة الاستلام" /> |
| app/pharmacy/rx-order.tsx | 175 | <SectionHeader title="طريقة الدفع" /> |
| app/pharmacy/rx-order.tsx | 185 | <SectionHeader title="بيانات التأمين" /> |
| app/pharmacy/rx-order.tsx | 207 | <SectionHeader title="ملخص التكلفة" /> |
| app/pharmacy/rx-order.tsx | 221 | label={payMethod === 'insurance' ? 'التحقق من التأمين وطلب الأدوية' : `تأكيد ودفع ${total} ر.س`} |
| app/pharmacy/scan-prescription.tsx | 37 | Alert.alert("عذراً", "نحتاج صلاحية الكاميرا لالتقاط صورة الوصفة."); |
| app/pharmacy/scan-prescription.tsx | 49 | Alert.alert("عذراً", "نحتاج صلاحية المعرض لاختيار صورة الوصفة."); |
| app/pharmacy/waiting-for-pharmacy.tsx | 122 | Alert.alert("إلغاء الطلب", "هل أنت متأكد من رغبتك في إلغاء الطلب؟", [ |
| app/profile/addresses.tsx | 145 | label="إضافة عنوان جديد" |
| app/profile/index.tsx | 40 | const userName = user?.full_name \|\| user?.name \|\| 'الحساب غير مكتمل'; |
| app/profile/index.tsx | 65 | <Button label="تسجيل الدخول / إنشاء حساب" variant="primary" onPress={handleLogout} style={{ width: '100%', marginTop: 8 }}/> |
| app/profile/index.tsx | 93 | {!isGuest && <Button label="تسجيل الخروج" variant="outline" icon="logout" onPress={handleLogout} style={{ borderColor: colors.error }}/>} |
| app/profile/insurance.tsx | 133 | label="تحديث الوثيقة" |
| app/profile/insurance.tsx | 154 | label="إضافة بطاقة تأمين" |
| app/programs/active.tsx | 79 | Alert.alert('تهانينا! ', `لقد ربحت ${selectedProg.milestoneReward} لمتابعتك التزامك بالبرنامج.`); |
| app/programs/active.tsx | 84 | Alert.alert('خطأ', 'تعذر تحديث الجلسة، حاول مرة أخرى'); |
| app/programs/active.tsx | 128 | <Badge label={`المدة: ${selectedProg.duration}`} color={colors.primary} /> |
| app/programs/active.tsx | 159 | <Button label="تأكيد الحضور أو إعادة الجدولة" variant="outline" size="sm" style={{ marginTop: 12 }} onPress={() => Alert.alert('التأكيد', 'تم تأكيد موعد حضورك بنجاح.')} /> |
| app/programs/active.tsx | 177 | <SectionHeader title="جدول الجلسات والزيارات" /> |
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
| app/reports/passport.tsx | 210 | <Badge label="مستمر" color={colors.success} /> |
| app/reports/timeline.tsx | 59 | Alert.alert("تحميل التقرير", `جاري تحميل ملف PDF الخاص بـ "${title}"...`, [ |
| app/reports/timeline.tsx | 105 | ["all", "الكل"], |
| app/reports/timeline.tsx | 106 | ["appointment", "استشارات"], |
| app/reports/timeline.tsx | 107 | ["lab", "تحاليل"], |
| app/reports/timeline.tsx | 108 | ["prescription", "وصفات"], |
| app/reports/timeline.tsx | 109 | ["vitals", "مؤشرات"], |
| app/reports/view-report.tsx | 72 | Alert.alert("تحميل PDF", "تم تجهيز التقرير كملف PDF — جاري التحميل...", [ |
| app/reports/view-report.tsx | 82 | Alert.alert("مشاركة", "جاري مشاركة التقرير..."); |
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
| app/returns/new-request.tsx | 27 | pharmacy: ['دواء تالف أو منتهي الصلاحية', 'خطأ في الطلب', 'دواء خاطئ', 'لم يصل الطلب', 'كميات ناقصة', 'سبب آخر'], |
| app/returns/new-request.tsx | 28 | consultation: ['إلغاء الموعد', 'الطبيب لم يحضر', 'جودة الاستشارة', 'مشكلة تقنية', 'سبب آخر'], |
| app/returns/new-request.tsx | 29 | diagnostics: ['تكرار الطلب', 'إلغاء التحليل', 'خطأ في النتائج', 'لم يتم السحب', 'سبب آخر'], |
| app/returns/new-request.tsx | 30 | nursing: ['الممرض لم يحضر', 'تأخر عن الموعد', 'جودة الخدمة', 'إلغاء الطلب', 'سبب آخر'], |
| app/returns/new-request.tsx | 31 | insurance: ['دفع زائد', 'خطأ في الحساب', 'خدمة غير مغطاة', 'سبب آخر'], |
| app/returns/new-request.tsx | 80 | Alert.alert('خطأ', 'فشل تقديم طلب الإرجاع. الرجاء المحاولة مرة أخرى.'); |
| app/returns/new-request.tsx | 181 | placeholder="مثال: ORD-2024-001" placeholderTextColor={colors.textTertiary} textAlign="right" /> |
| app/returns/new-request.tsx | 204 | placeholder="اشرح مشكلتك بالتفصيل..." placeholderTextColor={colors.textTertiary} |
| app/returns/new-request.tsx | 211 | <TouchableOpacity onPress={() => setAttachedDocs(p => [...p, `صورة ${p.length + 1}`])} |
| app/reviews/index.tsx | 103 | ["", "سيء", "مقبول", "جيد", "ممتاز", "رائع جداً!"][ |
| app/reviews/index.tsx | 160 | placeholder="شارك تجربتك مع الآخرين..." |
| app/search/index.tsx | 9 | const cats = ['الكل', 'أطباء', 'صيدلية', 'تحاليل', 'مقالات']; |
| app/search/index.tsx | 12 | const catMap = { 'أطباء': 'دكتور', 'صيدلية': 'دواء', 'تحاليل': 'تحليل', 'مقالات': 'مقال' }; |
| app/search/index.tsx | 75 | style={{ flex: 1, fontSize: 13, color: colors.n, textAlign: isRTL ? 'right' : 'left' }} placeholder={lang === 'ar' ? 'ابحث عن طبيب، دواء، تحليل...' : 'Search doctor, medicine, lab...'} |
| app/search/index.tsx | 172 | <Text style={{ fontSize: 8, color: colors.t3 }}>{lang === 'ar' ? 'ر.س' : 'SAR'}</Text> |
| app/settings/feedback.tsx | 45 | const TYPES = ["اقتراح", "مشكلة", "شكوى", "إطراء", "استفسار"]; |
| app/settings/feedback.tsx | 153 | placeholder="اكتب ملاحظتك هنا..." |
| app/settings/index.tsx | 45 | [{ icon: "logout", label: "تسجيل الخروج", danger: true }], |
| app/settings/index.tsx | 54 | if (item.label === "اللغة") { |
| app/settings/index.tsx | 58 | if (item.label === "تسجيل الخروج") { |
| app/settings/index.tsx | 106 | ) : item.label === "اللغة" ? ( |
| app/settings/security.tsx | 62 | Alert.alert('خطأ', 'كلمة المرور الجديدة وتأكيدها غير متطابقين'); |
| app/settings/security.tsx | 71 | Alert.alert('نجح', 'تم تغيير كلمة المرور بنجاح'); |
| app/settings/security.tsx | 77 | Alert.alert('خطأ', e?.message \|\| 'فشل تغيير كلمة المرور، تأكد من كلمة المرور الحالية'); |
| app/shared/location-picker.tsx | 99 | Alert.alert("الإذن مرفوض", "يرجى السماح بالوصول للموقع من الإعدادات."); |
| app/shared/location-picker.tsx | 131 | Alert.alert("خطأ", "تعذّر الحصول على موقعك الحالي."); |
| app/shared/location-picker.tsx | 147 | const addr = [g.street, g.district, g.city].filter(Boolean).join("، "); |
| app/shared/location-picker.tsx | 370 | name={addr.label === "العمل" ? "hospital" : "home"} |
| app/support/chat.tsx | 238 | placeholder="اكتب رسالتك..." |
| app/voice/index.tsx | 159 | const resp = RESPONSES[cmd.action] \|\| "تم تنفيذ الأمر بنجاح!"; |
| app/wallet/cards.tsx | 91 | [{ text: "حسناً" }], |
| app/wallet/cards.tsx | 110 | Alert.alert("خطأ", "تعذر حذف البطاقة"); |
| app/wallet/cards.tsx | 338 | label="إضافة بطاقة جديدة" |
| app/wallet/cards.tsx | 342 | Alert.alert("إضافة بطاقة", "اختر نوع البطاقة", [ |
| app/wallet/topup.tsx | 41 | Alert.alert("خطأ", "يرجى إدخال مبلغ صحيح"); |
| app/wallet/topup.tsx | 55 | Alert.alert("خطأ", "تعذر إتمام عملية الشحن"); |
| app/wallet/topup.tsx | 105 | <SectionHeader title="الخيارات" /> |
| app/wallet/transactions.tsx | 20 | const FILTERS = ["الكل", "خصم", "إيداع", "تحويل", "شحن"]; |
| app/wallet/transactions.tsx | 32 | const [filter, setFilter] = useState("الكل"); |
| app/wallet/transfer.tsx | 40 | Alert.alert("خطأ", "يرجى إدخال معرف مستلم صحيح"); |
| app/wallet/transfer.tsx | 53 | Alert.alert("خطأ", "يرجى إدخال مبلغ صحيح"); |
| app/wallet/transfer.tsx | 57 | Alert.alert("خطأ", "رصيدك الحالي غير كافٍ"); |
| app/wallet/transfer.tsx | 128 | <SectionHeader title="الخيارات" /> |
| app/wearables/hub.tsx | 48 | Alert.alert("تنبيه", "الرجاء ربط جهاز واحد على الأقل للمزامنة."); |
| app/wearables/hub.tsx | 119 | Alert.alert("خطأ", "حدث خطأ أثناء مزامنة البيانات."); |
| app/wearables/hub.tsx | 146 | <SectionHeader title="الأجهزة المتوفرة للربط" /> |
| app/wearables/hub.tsx | 264 | label={syncing ? "جاري المزامنة..." : "مزامنة القراءات الآن"} |
| src/components/Header.tsx | 34 | const getLangLabel = () => LANGUAGES.find((language) => language.code === lang)?.native ?? 'العربية'; |
| src/components/livekit-view.tsx | 144 | label={isMuted ? 'تفعيل الصوت' : 'كتم'} |
| src/components/livekit-view.tsx | 151 | label={isCameraOff ? 'تشغيل الكاميرا' : 'إيقاف الكاميرا'} |
| src/components/livekit-view.tsx | 158 | label={isSpeaker ? 'سماعة الهاتف' : 'مكبر الصوت'} |
| src/components/ui.tsx | 398 | {doctor.ins && <Badge label="تأمين" color={colors.success} icon="shield" />} |
| src/constants/index.ts | 1 | export const APP_NAME = 'نبض بلس'; |
| src/design-system/components/States.tsx | 183 | label="أعد المحاولة" |
| src/design-system/components/States.tsx | 193 | label="العودة" |
| src/features/consultation/InsuranceCopayScreen.tsx | 11 | <Text style={[styles.title, { color: colors.n }]}>موافقة التأمين</Text> |
| src/features/consultation/InsuranceCopayScreen.tsx | 12 | <Text style={[styles.subtitle, { color: colors.t2 }]}>تمت الموافقة. ادفع نسبة التحمل لفتح الاستشارة.</Text> |
| src/features/consultation/InsuranceCopayScreen.tsx | 20 | <Text style={styles.payText}>دفع نسبة التحمل</Text> |
| src/features/medical-orders/ActionableOrderScreen.tsx | 11 | <Text style={[styles.header, { color: colors.n }]}>طلب طبي معتمد</Text> |
| src/features/medical-orders/ActionableOrderScreen.tsx | 15 | <Text style={[styles.sectionTitle, { color: colors.n }]}>الأدوية الوصفية</Text> |
| src/features/medical-orders/ActionableOrderScreen.tsx | 20 | <Text style={styles.btnText}>اطلب من الصيدلية</Text> |
| src/features/medical-orders/ActionableOrderScreen.tsx | 27 | <Text style={[styles.sectionTitle, { color: colors.n }]}>تحاليل وأشعة</Text> |
| src/features/medical-orders/ActionableOrderScreen.tsx | 32 | <Text style={styles.btnText}>احجز موعد مختبر</Text> |
| src/services/ErrorHandler.tsx | 161 | label="أعد المحاولة" |
