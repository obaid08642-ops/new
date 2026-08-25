# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `messages/ur.json`
- **Member SHA-256:** `9879f69c64b61d14cfe2f8678caeeaa35bfa4ba61c9dd083a456de0aff1f92b4`
- **Line count:** 818
- **Read range:** `1-818`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `24: "Login": {`
- `29: "submit": "محفوظ سائن اِن",`
- `30: "submitting": "تصدیق ہو رہی ہے…",`
- `33: "twoFactorSubmit": "کوڈ کی تصدیق",`
- `34: "twoFactorSubmitting": "تصدیق ہو رہی ہے…",`
- `46: "otpSubmitting": "سائن اِن محفوظ ہو رہا ہے…",`
- `80: "loginTitle": "مریض کا سائن اِن"`
- `87: "RouteState": {`
- `94: "retry": "دوبارہ کوشش کریں",`
- `178: "cancelAppointment": "اپوائنٹمنٹ منسوخ کریں",`
- `179: "cancelConfirm": "کیا آپ واقعی یہ اپوائنٹمنٹ منسوخ کرنا چاہتے ہیں؟",`
- `180: "cancelReason": "وجہ (اختیاری)",`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `24: "Login": {`
- `42: "useOtp": "یک بار کا کوڈ استعمال کریں",`
- `44: "otpRequest": "یک بار کا کوڈ بھیجیں",`
- `45: "otpVerify": "کوڈ کی تصدیق کریں",`
- `46: "otpSubmitting": "سائن اِن محفوظ ہو رہا ہے…",`
- `47: "otpCode": "یک بار کا کوڈ",`
- `48: "otpCodeBody": "محفوظ تصدیقی سروس سے بھیجا گیا چھ ہندسوں کا کوڈ درج کریں۔",`
- `49: "otpSent": "یک بار کا کوڈ طلب کر دیا گیا ہے۔ اپنی منظور شدہ رابطہ گاہ دیکھیں۔",`
- `50: "otpRequestInvalid": "کوڈ طلب نہیں ہو سکا۔ شناخت دیکھ کر دوبارہ کوشش کریں۔",`
- `51: "otpInvalid": "کوڈ قبول نہیں ہوا۔ دوبارہ کوشش کریں۔",`
- `52: "otpExchangeInvalid": "محفوظ سیشن قائم نہیں ہو سکا۔ کوئی مقامی سیشن نہیں بنایا گیا۔",`
- `53: "otpUnavailable": "تصدیقی سروس دستیاب نہیں۔ کوئی سیشن نہیں بنایا گیا۔"`
### state_transitions
- `59: "loading": "مریض پورٹل لوڈ ہو رہا ہے",`
- `87: "RouteState": {`
- `88: "loadingCode": "لوڈ ہو رہا ہے",`
- `89: "loadingTitle": "صفحہ تیار ہو رہا ہے",`
- `90: "loadingBody": "مجاز جواب کے انتظار میں کوئی متبادل ڈیٹا نہیں دکھایا جاتا۔",`
- `91: "errorCode": "درخواست دستیاب نہیں",`
- `92: "errorTitle": "صفحہ اس وقت نہیں کھولا جا سکتا",`
- `93: "errorBody": "کوئی متبادل ڈیٹا یا تکنیکی تفصیل نہیں دکھائی گئی۔ دوبارہ کوشش کریں، یا مسئلہ برقرار رہے تو ہوم پر واپس جائیں۔",`
- `94: "retry": "دوبارہ کوشش کریں",`
- `103: "empty": "موجودہ تلاش سے کوئی شائع شدہ کیٹلاگ اندراج نہیں ملا۔",`
- `123: "empty": "اس اکاؤنٹ کے لیے فی الحال کوئی آرڈر دستیاب نہیں ہے۔",`
- `125: "statusUnavailable": "حالت دستیاب نہیں",`
### payment_insurance_relevance
- `136: "total": "کل",`
- `146: "subtotal": "ذیلی مجموعہ",`
- `148: "total": "کل",`
- `200: "callDiscard": "سیشن ختم کریں"`
- `282: "notice": "یہ صرف پڑھنے کی فہرست ہے۔ اس انٹرفیس سے payload links، پڑھنے کا نشان، ڈیوائس رجسٹریشن یا ترتیبات کا عمل نہیں ہوتا۔",`
- `372: "insurance": "انشورنس",`
- `404: "Insurance": {`
- `500: "sessionsSummary": "فعال {total} سیشنز میں سے پہلے {shown} دکھائے جا رہے ہیں۔"`
- `514: "offers": "پیشکشیں اور رعایتیں",`
- `525: "offers": "سروسز اور مصنوعات کی پیشکشیں",`
- `673: "price": "{value} ریال",`
- `674: "priceLabel": "قیمت",`
### error_empty_loading_retry_cancel
- `59: "loading": "مریض پورٹل لوڈ ہو رہا ہے",`
- `88: "loadingCode": "لوڈ ہو رہا ہے",`
- `89: "loadingTitle": "صفحہ تیار ہو رہا ہے",`
- `90: "loadingBody": "مجاز جواب کے انتظار میں کوئی متبادل ڈیٹا نہیں دکھایا جاتا۔",`
- `91: "errorCode": "درخواست دستیاب نہیں",`
- `92: "errorTitle": "صفحہ اس وقت نہیں کھولا جا سکتا",`
- `93: "errorBody": "کوئی متبادل ڈیٹا یا تکنیکی تفصیل نہیں دکھائی گئی۔ دوبارہ کوشش کریں، یا مسئلہ برقرار رہے تو ہوم پر واپس جائیں۔",`
- `94: "retry": "دوبارہ کوشش کریں",`
- `103: "empty": "موجودہ تلاش سے کوئی شائع شدہ کیٹلاگ اندراج نہیں ملا۔",`
- `123: "empty": "اس اکاؤنٹ کے لیے فی الحال کوئی آرڈر دستیاب نہیں ہے۔",`
- `144: "empty": "آپ کی کارٹ خالی ہے۔",`
- `158: "empty": "اس اکاؤنٹ کے لیے فی الحال کوئی اپوائنٹمنٹ دستیاب نہیں ہے۔",`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
