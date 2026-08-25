# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `messages/hi.json`
- **Member SHA-256:** `c74399e4b16164e8a637f77ca99aa9e1f02d5e637a4230dd3b139978e49e599d`
- **Line count:** 818
- **Read range:** `1-818`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `24: "Login": {`
- `29: "submit": "सुरक्षित साइन इन",`
- `30: "submitting": "सत्यापित किया जा रहा है…",`
- `33: "twoFactorSubmit": "कोड सत्यापित करें",`
- `34: "twoFactorSubmitting": "सत्यापन हो रहा है…",`
- `46: "otpSubmitting": "साइन इन सुरक्षित हो रहा है…",`
- `80: "loginTitle": "मरीज़ साइन इन"`
- `87: "RouteState": {`
- `94: "retry": "फिर प्रयास करें",`
- `178: "cancelAppointment": "अपॉइंटमेंट रद्द करें",`
- `179: "cancelConfirm": "क्या आप यह अपॉइंटमेंट रद्द करना चाहते हैं?",`
- `180: "cancelReason": "कारण (वैकल्पिक)",`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `24: "Login": {`
- `42: "useOtp": "वन-टाइम कोड उपयोग करें",`
- `44: "otpRequest": "वन-टाइम कोड भेजें",`
- `45: "otpVerify": "कोड सत्यापित करें",`
- `46: "otpSubmitting": "साइन इन सुरक्षित हो रहा है…",`
- `47: "otpCode": "वन-टाइम कोड",`
- `48: "otpCodeBody": "सुरक्षित प्रमाणीकरण सेवा से भेजा गया छह अंकों का कोड दर्ज करें।",`
- `49: "otpSent": "वन-टाइम कोड का अनुरोध किया गया है। अपनी स्वीकृत संपर्क विधि देखें।",`
- `50: "otpRequestInvalid": "कोड का अनुरोध नहीं हो सका। पहचान जाँचकर फिर प्रयास करें।",`
- `51: "otpInvalid": "वन-टाइम कोड स्वीकार नहीं हुआ। फिर प्रयास करें।",`
- `52: "otpExchangeInvalid": "सुरक्षित सत्र स्थापित नहीं हो सका। कोई स्थानीय सत्र नहीं बनाया गया।",`
- `53: "otpUnavailable": "प्रमाणीकरण सेवा उपलब्ध नहीं है। कोई सत्र नहीं बनाया गया।"`
### state_transitions
- `59: "loading": "मरीज़ पोर्टल लोड हो रहा है",`
- `87: "RouteState": {`
- `88: "loadingCode": "लोड हो रहा है",`
- `89: "loadingTitle": "पृष्ठ तैयार हो रहा है",`
- `90: "loadingBody": "अधिकृत उत्तर की प्रतीक्षा में कोई वैकल्पिक डेटा नहीं दिखाया जाता।",`
- `91: "errorCode": "अनुरोध उपलब्ध नहीं",`
- `92: "errorTitle": "पृष्ठ अभी नहीं खोला जा सकता",`
- `93: "errorBody": "कोई वैकल्पिक डेटा या तकनीकी विवरण नहीं दिखाया गया। फिर प्रयास करें, या समस्या बनी रहे तो मुख्य पृष्ठ पर लौटें।",`
- `94: "retry": "फिर प्रयास करें",`
- `103: "empty": "वर्तमान खोज से कोई प्रकाशित कैटलॉग प्रविष्टि नहीं मिली।",`
- `123: "empty": "इस खाते के लिए अभी कोई ऑर्डर उपलब्ध नहीं है।",`
- `125: "statusUnavailable": "स्थिति उपलब्ध नहीं",`
### payment_insurance_relevance
- `136: "total": "कुल",`
- `146: "subtotal": "उप-योग",`
- `148: "total": "कुल",`
- `200: "callDiscard": "सत्र हटाएँ"`
- `282: "notice": "यह केवल पढ़ने की सूची है। इस इंटरफ़ेस से payload लिंक, पढ़ने का चिह्न, डिवाइस पंजीकरण या सेटिंग संचालन नहीं होता।",`
- `372: "insurance": "बीमा",`
- `404: "Insurance": {`
- `500: "sessionsSummary": "{total} सक्रिय सत्रों में से पहले {shown} दिखाए जा रहे हैं।"`
- `514: "offers": "ऑफ़र और छूट",`
- `525: "offers": "सेवाओं और उत्पादों पर ऑफ़र",`
- `673: "price": "{value} SAR",`
- `674: "priceLabel": "कीमत",`
### error_empty_loading_retry_cancel
- `59: "loading": "मरीज़ पोर्टल लोड हो रहा है",`
- `88: "loadingCode": "लोड हो रहा है",`
- `89: "loadingTitle": "पृष्ठ तैयार हो रहा है",`
- `90: "loadingBody": "अधिकृत उत्तर की प्रतीक्षा में कोई वैकल्पिक डेटा नहीं दिखाया जाता।",`
- `91: "errorCode": "अनुरोध उपलब्ध नहीं",`
- `92: "errorTitle": "पृष्ठ अभी नहीं खोला जा सकता",`
- `93: "errorBody": "कोई वैकल्पिक डेटा या तकनीकी विवरण नहीं दिखाया गया। फिर प्रयास करें, या समस्या बनी रहे तो मुख्य पृष्ठ पर लौटें।",`
- `94: "retry": "फिर प्रयास करें",`
- `103: "empty": "वर्तमान खोज से कोई प्रकाशित कैटलॉग प्रविष्टि नहीं मिली।",`
- `123: "empty": "इस खाते के लिए अभी कोई ऑर्डर उपलब्ध नहीं है।",`
- `144: "empty": "आपकी कार्ट खाली है।",`
- `158: "empty": "इस खाते के लिए अभी कोई अपॉइंटमेंट उपलब्ध नहीं है।",`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
