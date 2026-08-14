# تدقيق ثانٍ للبيانات الوهمية والاحتياطية — تطبيق المريض

> هذا فحص مصدر ساكن. المصطلح المرصود ليس دليلاً بذاته على عطل؛ يراجع كل سطر لتصنيفه إلى تعليق، placeholder واجهة مشروع، حماية fallback آمنة، أو بيانات ظاهرة يجب حذفها/ربطها بخادم.

| الفئة | العدد |
|---|---:|
| placeholder | 124 |
| fallback | 33 |
| mock/demo/fake | 21 |
| seed/test fixture | 11 |
| hard-coded health/finance sample | 2 |

| الملف | السطر | الفئة | المقتطف |
|---|---:|---|---|
| app/(auth)/forgot-password.tsx | 106 | placeholder | placeholder="البريد الإلكتروني" |
| app/(auth)/login.tsx | 250 | placeholder | placeholder="example@mail.com" |
| app/(auth)/login.tsx | 270 | placeholder | placeholder="••••••••" |
| app/(auth)/register.tsx | 34 | placeholder | const AuthField = ({ label, icon, placeholder, value, onChangeText, isPass, isDark, isRTL, focusedInput, setFocusedInput, showPassword, setShowPassword }: any) => ( |
| app/(auth)/register.tsx | 43 | placeholder | placeholder={placeholder} |
| app/(auth)/register.tsx | 229 | placeholder | placeholder={'أدخل اسمك الكامل'} |
| app/(auth)/register.tsx | 238 | placeholder | placeholder={'0500000000'} |
| app/(auth)/register.tsx | 247 | placeholder | placeholder="example@mail.com" |
| app/(auth)/register.tsx | 256 | placeholder | placeholder="••••••••" |
| app/(auth)/register.tsx | 266 | placeholder | placeholder="••••••••" |
| app/(auth)/reset-password.tsx | 115 | placeholder | placeholder="كلمة المرور الجديدة" |
| app/(auth)/reset-password.tsx | 125 | placeholder | placeholder="تأكيد كلمة المرور" |
| app/(tabs)/consultations/index.tsx | 184 | placeholder | placeholder="ابحث عن دكتور أو تخصص..." |
| app/(tabs)/diagnostics.tsx | 108 | placeholder | placeholder={mainTab === 'labs' ? "ابحث عن تحليل، باقة، أو مختبر..." : "ابحث عن نوع الأشعة أو المركز..."} |
| app/(tabs)/nursing.tsx | 114 | placeholder | placeholder="ابحث عن خدمة أو ممرض..." |
| app/(tabs)/pharmacy.tsx | 168 | fallback | // Filter client-side as fallback if backend isn't filtering correctly |
| app/(tabs)/pharmacy.tsx | 218 | placeholder | placeholder={lang === 'ar' ? 'ابحث بالاسم أو المادة الفعالة...' : 'Search medicines...'} |
| app/ai/chat-doctor.tsx | 224 | placeholder | placeholder="اكتب سؤالك الطبي..." |
| app/ai/triage.tsx | 209 | placeholder | placeholder="اكتب أعراضك هنا (مثال: أشعر بصداع كلي...)" |
| app/ai-assistant.tsx | 150 | placeholder | placeholder="اكتب استفسارك الطبي..." |
| app/community/post-detail.tsx | 255 | placeholder | placeholder="أضف تعليقاً..." |
| app/consultations/chat-with-doctor.tsx | 152 | placeholder | placeholder="اكتب رسالة..." |
| app/consultations/doctor-search.tsx | 67 | fallback | // Keep static fallback on error |
| app/consultations/doctor-search.tsx | 111 | placeholder | placeholder="ابحث بالاسم أو التخصص..." |
| app/consultations/follow-up.tsx | 131 | placeholder | <Input value={newUpdate} onChangeText={setNewUpdate} placeholder="كيف حالتك اليوم؟ أي تحسن أو أعراض جديدة؟" icon="edit" multiline /> |
| app/consultations/offer/[id].tsx | 46 | fallback | // Keep initial fallback list |
| app/consultations/post-call-rating.tsx | 101 | placeholder | placeholder="اكتب رأيك في الخدمة..." |
| app/consultations/specialty-select.tsx | 68 | placeholder | placeholder="ابحث عن تخصص..." |
| app/consultations/video-call.tsx | 44 | fallback | let serverUrl = "wss://livekit.nabdahplus.com"; // Default fallback |
| app/diagnostics/booking-confirm.tsx | 227 | placeholder | <Input value={policyNumber} onChangeText={setPolicyNumber} placeholder="رقم بوليصة التأمين" icon="document" /> |
| app/diagnostics/booking-confirm.tsx | 228 | placeholder | <Input value={memberId} onChangeText={setMemberId} placeholder="رقم عضوية التأمين" icon="user" /> |
| app/diagnostics/order/[id].tsx | 152 | placeholder | {/* Map Placeholder */} |
| app/diagnostics/packages.tsx | 65 | placeholder | placeholder="ابحث عن باقة..." |
| app/diagnostics/search.tsx | 40 | fallback | // keep static fallback |
| app/diagnostics/search.tsx | 66 | placeholder | placeholder="ابحث عن تحليل..." |
| app/diagnostics/test-detail.tsx | 24 | seed/test fixture | const [testData, setTestData] = useState<any>(null); |
| app/diagnostics/test-detail.tsx | 37 | seed/test fixture | if (!testData) return <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' } ]}><AppText>حدث خطأ، يرجى المحاولة لاحقاً</AppText></SafeAreaView>; |
| app/diagnostics/test-detail.tsx | 64 | seed/test fixture | <AppText style={{ fontSize: 24, fontWeight: 'bold', color: colors.textPrimary, marginTop: 16, textAlign: 'center' }}>{testData.name}</AppText> |
| app/diagnostics/test-detail.tsx | 71 | seed/test fixture | {testData.desc \|\| testData.description \|\| 'لا يوجد وصف متاح.'} |
| app/diagnostics/test-detail.tsx | 83 | seed/test fixture | {testData.requirements \|\| 'لا توجد تحضيرات خاصة'} |
| app/diagnostics/test-detail.tsx | 94 | seed/test fixture | <AppText style={{ color: colors.textSecondary, fontWeight: 'bold' }}>{testData.time \|\| testData.turnaroundTime \|\| '٢٤ ساعة'}</AppText> |
| app/diagnostics/test-detail.tsx | 102 | seed/test fixture | <AppText style={{ fontSize: 24, fontWeight: '900', color: colors.primary }}>{testData.price} <AppText style={{ fontSize: 14, color: colors.primary }}>ر.س</AppText></AppText> |
| app/diagnostics/test-detail.tsx | 107 | seed/test fixture | onPress={() => addItem({ id, name: testData.name, price: parseInt(testData.price), kind: isRadiology ? 'radiology' : 'lab' })} |
| app/emergency/tracking.tsx | 76 | placeholder | {/* Map placeholder */} |
| app/family/chat.tsx | 98 | placeholder | <TextInput value={msg} onChangeText={setMsg} placeholder="اكتب رسالة..." placeholderTextColor={colors.textTertiary} style={[st.input, { backgroundColor: colors.surfaceSecondary, color: colors.textPrimary }]} onSubmitEditing={send} /> |
| app/family/invite.tsx | 69 | placeholder | <Input value={name} onChangeText={setName} placeholder="اسم الفرد" icon="user" /> |
| app/family/join.tsx | 134 | placeholder | placeholder="مثال: NABDAH-F7X2K9" |
| app/family/permission-request.tsx | 25 | fallback | const req = res.find(r => r._id === requestId \|\| r.id === requestId) \|\| res[0]; // fallback to first if no ID passed for some reason |
| app/health/conditions-allergies.tsx | 155 | placeholder | placeholder="ابحث عن مرض..." |
| app/health/conditions-allergies.tsx | 215 | placeholder | placeholder="ابحث عن حساسية..." |
| app/health/edit-profile.tsx | 435 | placeholder | placeholder="أضف حساسية..." |
| app/health/health-id.tsx | 2 | mock/demo/fake | // Patient health identity: only server-backed profile data; never local demo records. |
| app/health/medication-reminder-add.tsx | 75 | placeholder | <Input value={name} onChangeText={setName} placeholder="مثال: بنادول إكسترا 500mg" icon="medication" /> |
| app/health/medication-reminder-add.tsx | 186 | placeholder | <Input value={notes} onChangeText={setNotes} placeholder="ملاحظات إضافية (اختياري)" icon="edit" multiline /> |
| app/health/vitals-log.tsx | 232 | placeholder | <Input value={value1} onChangeText={setValue1} placeholder="الانقباضي" keyboardType="numeric" icon="trending_up" style={{ flex: 1 }}/> |
| app/health/vitals-log.tsx | 234 | placeholder | <Input value={value2} onChangeText={setValue2} placeholder="الانبساطي" keyboardType="numeric" icon="trendingDown" style={{ flex: 1 }}/> |
| app/health/vitals-log.tsx | 237 | placeholder | <Input value={value1} onChangeText={setValue1} placeholder={`القراءة (${config.unit})`} keyboardType="numeric" icon={config.icon} style={{ marginTop: 8 }}/> |
| app/insurance/add-policy.tsx | 97 | placeholder | { label: 'رقم البوليصة', val: policyNum, setter: setPolicyNum, placeholder: 'BUP-XXXX-XXXXXX' }, |
| app/insurance/add-policy.tsx | 98 | placeholder | { label: 'رقم العضوية / الهوية الوطنية', val: memberId, setter: setMemberId, placeholder: 'M-XXXXXX' }, |
| app/insurance/add-policy.tsx | 104 | placeholder | placeholder={f.placeholder} placeholderTextColor={colors.textTertiary} textAlign="right" /> |
| app/insurance/coverage-check.tsx | 104 | placeholder | placeholder="اسم الطبيب أو المستشفى أو الصيدلية" |
| app/insurance/network-providers.tsx | 80 | placeholder | placeholder="ابحث عن مزود..." |
| app/map/index.tsx | 197 | fallback | } catch { /* keep fallback */ } |
| app/map/index.tsx | 412 | placeholder | placeholder="ابحث عن دكتور، صيدلية، مستشفى..." |
| app/maternity/baby-growth.tsx | 312 | placeholder | placeholder="مثال: 6" |
| app/maternity/baby-growth.tsx | 323 | placeholder | placeholder="مثال: 7.5" |
| app/maternity/baby-growth.tsx | 334 | placeholder | placeholder="مثال: 65" |
| app/maternity/baby-growth.tsx | 345 | placeholder | placeholder="مثال: 42" |
| app/maternity/hub.tsx | 86 | fallback | // Default profile fallback if setup was completed |
| app/maternity/hub.tsx | 174 | fallback | // fallback to local storage |
| app/maternity/pregnancy-tracker.tsx | 55 | fallback | let calcWeek = res.current_week \|\| 4; // fallback |
| app/mental-health/mood-journal.tsx | 144 | placeholder | placeholder="اكتب ما يخطر على بالك..." |
| app/nutrition/ai-plan-builder.tsx | 121 | placeholder | <Input value={form.weight} onChangeText={v => set('weight', v)} placeholder="الوزن (كغ)" keyboardType="numeric" icon="weight" style={{ flex: 1 }} /> |
| app/nutrition/ai-plan-builder.tsx | 122 | placeholder | <Input value={form.height} onChangeText={v => set('height', v)} placeholder="الطول (سم)" keyboardType="numeric" icon="trending_up" style={{ flex: 1 }} /> |
| app/nutrition/ai-plan-builder.tsx | 125 | placeholder | <Input value={form.age} onChangeText={v => set('age', v)} placeholder="العمر" keyboardType="numeric" icon="calendar" style={{ flex: 1 }} /> |
| app/nutrition/ai-plan-builder.tsx | 126 | placeholder | <Input value={form.targetWeight} onChangeText={v => set('targetWeight', v)} placeholder="الوزن المستهدف" keyboardType="numeric" icon="success" style={{ flex: 1 }} /> |
| app/nutrition/ai-plan-builder.tsx | 150 | placeholder | <Input value={allergies} onChangeText={setAllergies} placeholder="حساسية أو أطعمة ممنوعة (اختياري)" icon="warning" /> |
| app/nutrition/body-composition.tsx | 100 | placeholder | {/* Body silhouette placeholder */} |
| app/nutrition/body-target.tsx | 77 | placeholder | <Input value={weight} onChangeText={setWeight} placeholder="الوزن (كغ)" keyboardType="numeric" icon="weight" style={{ flex: 1 }}/> |
| app/nutrition/body-target.tsx | 78 | placeholder | <Input value={height} onChangeText={setHeight} placeholder="الطول (سم)" keyboardType="numeric" icon="trending_up" style={{ flex: 1 }}/> |
| app/nutrition/body-target.tsx | 98 | placeholder | <Input value={targetWeight} onChangeText={setTargetWeight} placeholder="الوزن المستهدف (كغ)" keyboardType="numeric" icon="success" /> |
| app/nutrition/calorie-analyzer.tsx | 110 | placeholder | placeholder="مثال: كبسة لحم مع سلطة وزبادي..." |
| app/nutrition/exercise-plan.tsx | 1 | mock/demo/fake | // Exercise plans require a server-backed, clinically reviewed plan; no local demo routines are shown. |
| app/nutrition/log-meal.tsx | 146 | placeholder | placeholder="ابحث عن طعام..." placeholderTextColor={colors.textTertiary} textAlign="right" /> |
| app/payments/processing.tsx | 209 | fallback | // WebView fallback: open in external browser |
| app/pharmacy/chat-with-pharmacist.tsx | 310 | placeholder | placeholder="اكتب رسالتك للصيدلي..." |
| app/pharmacy/custom-item.tsx | 122 | placeholder | placeholder: "مثال: ميتفورمين 500mg", |
| app/pharmacy/custom-item.tsx | 128 | placeholder | placeholder: "مثال: 500mg", |
| app/pharmacy/custom-item.tsx | 134 | placeholder | placeholder: "مثال: 2 علبة", |
| app/pharmacy/custom-item.tsx | 167 | placeholder | placeholder={f.placeholder} |
| app/pharmacy/custom-item.tsx | 204 | placeholder | placeholder="أي معلومات إضافية..." |
| app/pharmacy/drug-not-found.tsx | 98 | placeholder | <Input value={name} onChangeText={setName} placeholder="اسم الدواء *" icon="medication" /> |
| app/pharmacy/drug-not-found.tsx | 99 | placeholder | <Input value={dose} onChangeText={setDose} placeholder="التركيز / الجرعة (مثال: 500mg)" icon="edit" /> |
| app/pharmacy/drug-not-found.tsx | 101 | placeholder | <Input value={qty} onChangeText={v => setQty(v.replace(/\D/g, ''))} placeholder="الكمية" keyboardType="numeric" icon="shopping_cart" style={{ flex: 1 }} /> |
| app/pharmacy/drug-not-found.tsx | 104 | placeholder | <Input value={notes} onChangeText={setNotes} placeholder="ملاحظات إضافية (اختياري)" icon="edit" multiline /> |
| app/pharmacy/filters.tsx | 254 | placeholder | placeholder="الحد الأدنى" |
| app/pharmacy/filters.tsx | 264 | placeholder | placeholder="الحد الأقصى" |
| app/pharmacy/filters.tsx | 303 | placeholder | placeholder="ابحث عن شركة..." |
| app/pharmacy/manual-order.tsx | 88 | placeholder | placeholder="مثال: كونجستال أقراص" |
| app/pharmacy/manual-order.tsx | 97 | placeholder | placeholder="أضف أي تفاصيل أخرى تساعد الصيدلي..." |
| app/pharmacy/pharmacist-chat.tsx | 342 | placeholder | placeholder="اكتب رسالتك للصيدلي..." |
| app/pharmacy/reorder.tsx | 133 | placeholder | <Input value={address} onChangeText={setAddress} placeholder="عنوان التوصيل" icon="location" style={{ marginTop: 10 }}/> |
| app/pharmacy/waiting-for-pharmacy.tsx | 8 | fallback | * - Graceful fallback: after 5 seconds simulates pharmacy found for testing. |
| app/pharmacy/waiting-for-pharmacy.tsx | 107 | fallback | // Backend offline – ignore, rely on fallback timer |
| app/pharmacy/waiting-for-pharmacy.tsx | 114 | mock/demo/fake | // Removed fallback simulated order |
| app/pharmacy/waiting-for-pharmacy.tsx | 114 | fallback | // Removed fallback simulated order |
| app/programs/active.tsx | 128 | mock/demo/fake | {/* Simulated progress bar */} |
| app/returns/new-request.tsx | 184 | placeholder | placeholder="مثال: ORD-2024-001" placeholderTextColor={colors.textTertiary} textAlign="right" /> |
| app/returns/new-request.tsx | 207 | placeholder | placeholder="اشرح مشكلتك بالتفصيل..." placeholderTextColor={colors.textTertiary} |
| app/reviews/index.tsx | 160 | placeholder | placeholder="شارك تجربتك مع الآخرين..." |
| app/search/index.tsx | 83 | placeholder | style={{ flex: 1, fontSize: 13, color: colors.n, textAlign: isRTL ? 'right' : 'left' }} placeholder={lang === 'ar' ? 'ابحث عن طبيب، دواء، تحليل...' : 'Search doctor, medicine, lab...'} |
| app/settings/feedback.tsx | 158 | placeholder | placeholder="اكتب ملاحظتك هنا..." |
| app/settings/security.tsx | 225 | placeholder | placeholder="••••••••" |
| app/shared/location-picker.tsx | 585 | placeholder | placeholder: "اسم العنوان (مثال: المنزل)", |
| app/shared/location-picker.tsx | 588 | placeholder | { key: "street", placeholder: "الشارع والحي", icon: "location" }, |
| app/shared/location-picker.tsx | 591 | placeholder | placeholder: "رقم المبنى / اسمه", |
| app/shared/location-picker.tsx | 596 | placeholder | placeholder: "الطابق (اختياري)", |
| app/shared/location-picker.tsx | 601 | placeholder | placeholder: "ملاحظات للمندوب (اختياري)", |
| app/shared/location-picker.tsx | 615 | placeholder | placeholder={field.placeholder} |
| app/support/chat.tsx | 238 | placeholder | placeholder="اكتب رسالتك..." |
| src/__tests__/mocks/MockDataSources.ts | 2 | mock/demo/fake | * Mock Services — Injectable mock implementations for testing. |
| src/__tests__/mocks/MockDataSources.ts | 48 | mock/demo/fake | const item = { ...dto, id: dto.id ?? `mock-${Date.now()}` } as TModel; |
| src/__tests__/mocks/MockDataSources.ts | 65 | seed/test fixture | /** Test helper — seed data */ |
| src/__tests__/mocks/MockDataSources.ts | 66 | seed/test fixture | seed(items: TModel[]): void { |
| src/__tests__/utils/testUtils.ts | 2 | mock/demo/fake | * Test utilities — Mock factories and test helpers. |
| src/__tests__/utils/testUtils.ts | 8 | mock/demo/fake | // Mock Config |
| src/__tests__/utils/testUtils.ts | 58 | mock/demo/fake | // Mock services |
| src/__tests__/utils/testUtils.ts | 96 | mock/demo/fake | // Mock data factories |
| src/__tests__/utils/testUtils.ts | 125 | mock/demo/fake | // AsyncStorage mock (for Jest) |
| src/__tests__/utils/testUtils.ts | 142 | mock/demo/fake | // DI Container mock setup (for unit tests) |
| src/components/LocalizedTextInput.tsx | 1 | placeholder | // LocalizedTextInput translates only user-visible placeholder text and preserves native input behavior and props. |
| src/components/LocalizedTextInput.tsx | 7 | placeholder | export function LocalizedTextInput({ placeholder, ...props }: TextInputProps) { |
| src/components/LocalizedTextInput.tsx | 9 | placeholder | return <NativeTextInput {...props} placeholder={typeof placeholder === 'string' ? autoTranslate(placeholder, lang) : placeholder} />; |
| src/components/animations.tsx | 69 | placeholder | // Shimmer Loading Placeholder |
| src/components/ui.tsx | 24 | fallback | // fallback + wrong textAlign). Always use this instead of raw <Text>. |
| src/components/ui.tsx | 446 | placeholder | placeholder?: string; |
| src/components/ui.tsx | 459 | placeholder | value, onChangeText, placeholder, icon, iconRight, onIconRightPress, |
| src/components/ui.tsx | 463 | placeholder | const translatedPlaceholder = autoTranslate(placeholder, lang); |
| src/components/ui.tsx | 485 | placeholder | placeholder={translatedPlaceholder} |
| src/constants/insurance.ts | 38 | hard-coded health/finance sample | { key: 'b', label: 'B', copayPercent: 20, maxCoverage: 300000 }, |
| src/context/CartContext.tsx | 122 | fallback | // API call failed, ignore (guest fallback) |
| src/core/platform/auth/BiometricService.ts | 40 | fallback | disableDeviceFallback: false, // Explicitly allow passcode fallback |
| src/core/platform/auth/SessionManager.ts | 73 | placeholder | // API Call to rotate tokens (Placeholder for Phase 1C-C/Phase 3) |
| src/core/platform/location/LocationService.ts | 33 | placeholder | // Haversine formula implementation placeholder |
| src/data/database/core/DatabaseProvider.ts | 19 | placeholder | // Future implementation placeholder |
| src/design-system/components/Avatar.tsx | 2 | fallback | * DS Avatar — User/Provider/System avatar with fallback initials, |
| src/design-system/components/Avatar.tsx | 32 | fallback | /** Background color for initials fallback */ |
| src/design-system/components/Input.tsx | 29 | placeholder | placeholder?: string; |
| src/design-system/components/Input.tsx | 50 | placeholder | placeholder, |
| src/design-system/components/Input.tsx | 137 | placeholder | placeholder={placeholder} |
| src/design-system/components/Loading.tsx | 76 | placeholder | // DS Skeleton — Shimmer placeholder for content loading |
| src/design-system/components/SearchBar.tsx | 30 | placeholder | placeholder?: string; |
| src/design-system/components/SearchBar.tsx | 51 | placeholder | placeholder, |
| src/design-system/components/SearchBar.tsx | 68 | placeholder | placeholder ?? |
| src/design-system/components/SearchBar.tsx | 155 | placeholder | placeholder={defaultPlaceholder} |
| src/guided-tour/providers/ContentProvider.ts | 15 | fallback | // Priority 3: Static bundle fallback |
| src/modules/admin/index.ts | 24 | placeholder | export {}; // Module placeholder — implementation in Phase 3 |
| src/modules/chat/index.ts | 24 | placeholder | export {}; // Module placeholder — implementation in Phase 3 |
| src/modules/consultations/index.ts | 24 | placeholder | export {}; // Module placeholder — implementation in Phase 3 |
| src/modules/diagnostics/index.ts | 24 | placeholder | export {}; // Module placeholder — implementation in Phase 3 |
| src/modules/insurance/index.ts | 24 | placeholder | export {}; // Module placeholder — implementation in Phase 3 |
| src/modules/notifications/index.ts | 24 | placeholder | export {}; // Module placeholder — implementation in Phase 3 |
| src/modules/nursing/index.ts | 24 | placeholder | export {}; // Module placeholder — implementation in Phase 3 |
| src/modules/orders/index.ts | 24 | placeholder | export {}; // Module placeholder — implementation in Phase 3 |
| src/modules/payments/index.ts | 24 | placeholder | export {}; // Module placeholder — implementation in Phase 3 |
| src/modules/pharmacy/index.ts | 24 | placeholder | export {}; // Module placeholder — implementation in Phase 3 |
| src/modules/profile/index.ts | 24 | placeholder | export {}; // Module placeholder — implementation in Phase 3 |
| src/services/ErrorHandler.tsx | 117 | fallback | fallback?: (error: AppError, reset: () => void) => React.ReactNode; |
| src/services/ErrorHandler.tsx | 148 | fallback | if (this.props.fallback) { |
| src/services/ErrorHandler.tsx | 149 | fallback | return this.props.fallback(error, this.reset); |
| src/services/ErrorHandler.tsx | 153 | fallback | <View style={styles.fallback}> |
| src/services/ErrorHandler.tsx | 190 | fallback | fallback: { |
| src/services/FeatureFlags.ts | 102 | seed/test fixture | // Seed with static defaults |
| src/store/ReducerManager.ts | 48 | fallback | : (state: any) => state; // fallback if all reducers removed |
| src/store/__tests__/SecureStorageAdapter.test.ts | 5 | mock/demo/fake | // Mock the native modules |
| src/store/__tests__/SecureStorageAdapter.test.ts | 6 | mock/demo/fake | jest.mock('@react-native-async-storage/async-storage', () => ({ |
| src/store/__tests__/SecureStorageAdapter.test.ts | 12 | mock/demo/fake | jest.mock('expo-secure-store', () => ({ |
| src/store/__tests__/SecureStorageAdapter.test.ts | 23 | mock/demo/fake | (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('test-key'); |
| src/store/__tests__/SecureStorageAdapter.test.ts | 30 | mock/demo/fake | const savedArg = (AsyncStorage.setItem as jest.Mock).mock.calls[0][1]; |
| src/store/__tests__/SecureStorageAdapter.test.ts | 35 | mock/demo/fake | (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('test-key'); |
| src/store/__tests__/SecureStorageAdapter.test.ts | 41 | mock/demo/fake | (AsyncStorage.getItem as jest.Mock).mockResolvedValue(encrypted); |
| src/store/__tests__/SecureStorageAdapter.test.ts | 48 | mock/demo/fake | (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null); |
| src/store/persistence/SecureStorageAdapter.ts | 35 | fallback | return 'fallback-insecure-key-do-not-use-in-prod'; |
| src/store/persistence/StoreVersionManager.ts | 22 | fallback | * Wraps Redux Persist createMigrate to add corruption detection and fallback mechanisms. |
| src/store/utils/testUtils.tsx | 21 | mock/demo/fake | // For now, we mock it via the singleton store. |
| src/theme/ThemeEngine.ts | 79 | fallback | // Resolve a color key with Admin override fallback |
| src/theme/ThemeEngine.ts | 81 | fallback | (key: keyof typeof colors, fallback?: string): string => { |
| src/theme/ThemeEngine.ts | 85 | fallback | return String(colors[key] ?? fallback ?? '#000'); |
| src/theme/colors.ts | 80 | fallback | // fallback to light colors if no colors object provided |
| src/types/index.ts | 523 | hard-coded health/finance sample | gender: 'male' \| 'female'; |
| src/utils/security.ts | 6 | fallback | // Secure Storage – wraps expo-secure-store with AsyncStorage fallback |
