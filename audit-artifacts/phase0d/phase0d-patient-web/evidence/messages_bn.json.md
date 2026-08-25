# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `messages/bn.json`
- **Member SHA-256:** `70c695a1a711d22e51b4fb888f3ae05290274e4ab8d9195dddb3f74a233f496e`
- **Line count:** 818
- **Read range:** `1-818`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `24: "Login": {`
- `29: "submit": "নিরাপদে সাইন ইন",`
- `30: "submitting": "যাচাই করা হচ্ছে…",`
- `33: "twoFactorSubmit": "কোড যাচাই করুন",`
- `34: "twoFactorSubmitting": "যাচাই করা হচ্ছে…",`
- `46: "otpSubmitting": "সাইন ইন সুরক্ষিত করা হচ্ছে…",`
- `80: "loginTitle": "রোগীর সাইন ইন"`
- `87: "RouteState": {`
- `94: "retry": "আবার চেষ্টা করুন",`
- `178: "cancelAppointment": "অ্যাপয়েন্টমেন্ট বাতিল করুন",`
- `179: "cancelConfirm": "আপনি কি এই অ্যাপয়েন্টমেন্ট বাতিল করতে চান?",`
- `180: "cancelReason": "কারণ (ঐচ্ছিক)",`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `24: "Login": {`
- `42: "useOtp": "ওয়ান-টাইম কোড ব্যবহার করুন",`
- `44: "otpRequest": "ওয়ান-টাইম কোড পাঠান",`
- `45: "otpVerify": "কোড যাচাই করুন",`
- `46: "otpSubmitting": "সাইন ইন সুরক্ষিত করা হচ্ছে…",`
- `47: "otpCode": "ওয়ান-টাইম কোড",`
- `48: "otpCodeBody": "নিরাপদ প্রমাণীকরণ পরিষেবা থেকে পাঠানো ছয় অঙ্কের কোড লিখুন।",`
- `49: "otpSent": "ওয়ান-টাইম কোডের অনুরোধ করা হয়েছে। আপনার অনুমোদিত যোগাযোগ মাধ্যম দেখুন।",`
- `50: "otpRequestInvalid": "কোডের অনুরোধ করা যায়নি। পরিচয় পরীক্ষা করে আবার চেষ্টা করুন।",`
- `51: "otpInvalid": "ওয়ান-টাইম কোড গ্রহণ করা হয়নি। আবার চেষ্টা করুন।",`
- `52: "otpExchangeInvalid": "নিরাপদ সেশন তৈরি করা যায়নি। কোনো স্থানীয় সেশন তৈরি হয়নি।",`
- `53: "otpUnavailable": "প্রমাণীকরণ পরিষেবা অনুপলভ্য। কোনো সেশন তৈরি হয়নি।"`
### state_transitions
- `59: "loading": "রোগী পোর্টাল লোড হচ্ছে",`
- `87: "RouteState": {`
- `88: "loadingCode": "লোড হচ্ছে",`
- `89: "loadingTitle": "পৃষ্ঠা প্রস্তুত হচ্ছে",`
- `90: "loadingBody": "অনুমোদিত প্রতিক্রিয়ার অপেক্ষায় কোনো বিকল্প ডেটা দেখানো হয় না।",`
- `91: "errorCode": "অনুরোধ উপলব্ধ নয়",`
- `92: "errorTitle": "পৃষ্ঠা এখন খোলা যাচ্ছে না",`
- `93: "errorBody": "কোনো বিকল্প ডেটা বা প্রযুক্তিগত বিবরণ দেখানো হয়নি। আবার চেষ্টা করুন, অথবা সমস্যা চললে হোমে ফিরুন।",`
- `94: "retry": "আবার চেষ্টা করুন",`
- `103: "empty": "বর্তমান অনুসন্ধানে কোনো প্রকাশিত ক্যাটালগ এন্ট্রি মেলেনি।",`
- `123: "empty": "এই অ্যাকাউন্টের জন্য বর্তমানে কোনো অর্ডার নেই।",`
- `125: "statusUnavailable": "অবস্থা অনুপলব্ধ",`
### payment_insurance_relevance
- `136: "total": "মোট",`
- `146: "subtotal": "উপমোট",`
- `148: "total": "মোট",`
- `200: "callDiscard": "সেশন বাতিল করুন"`
- `282: "notice": "এটি শুধু-পাঠযোগ্য তালিকা। এই ইন্টারফেস থেকে payload link, পড়া চিহ্ন, ডিভাইস নিবন্ধন বা সেটিংস কার্যক্রম করা হয় না।",`
- `372: "insurance": "বীমা",`
- `404: "Insurance": {`
- `500: "sessionsSummary": "মোট {total} সক্রিয় সেশনের মধ্যে প্রথম {shown}টি দেখানো হচ্ছে।"`
- `514: "offers": "অফার ও ছাড়",`
- `525: "offers": "সেবা ও পণ্যের অফার",`
- `673: "price": "{value} SAR",`
- `674: "priceLabel": "মূল্য",`
### error_empty_loading_retry_cancel
- `59: "loading": "রোগী পোর্টাল লোড হচ্ছে",`
- `88: "loadingCode": "লোড হচ্ছে",`
- `89: "loadingTitle": "পৃষ্ঠা প্রস্তুত হচ্ছে",`
- `90: "loadingBody": "অনুমোদিত প্রতিক্রিয়ার অপেক্ষায় কোনো বিকল্প ডেটা দেখানো হয় না।",`
- `91: "errorCode": "অনুরোধ উপলব্ধ নয়",`
- `92: "errorTitle": "পৃষ্ঠা এখন খোলা যাচ্ছে না",`
- `93: "errorBody": "কোনো বিকল্প ডেটা বা প্রযুক্তিগত বিবরণ দেখানো হয়নি। আবার চেষ্টা করুন, অথবা সমস্যা চললে হোমে ফিরুন।",`
- `94: "retry": "আবার চেষ্টা করুন",`
- `103: "empty": "বর্তমান অনুসন্ধানে কোনো প্রকাশিত ক্যাটালগ এন্ট্রি মেলেনি।",`
- `123: "empty": "এই অ্যাকাউন্টের জন্য বর্তমানে কোনো অর্ডার নেই।",`
- `144: "empty": "আপনার কার্ট খালি।",`
- `158: "empty": "এই অ্যাকাউন্টের জন্য বর্তমানে কোনো অ্যাপয়েন্টমেন্ট নেই।",`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
