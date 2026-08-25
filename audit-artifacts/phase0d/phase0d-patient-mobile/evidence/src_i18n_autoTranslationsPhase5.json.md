# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/i18n/autoTranslationsPhase5.json`
- **Member SHA-256:** `66b0db8057e960c26327cf7d00ac7d4b9b92ada4e34f70df72ecddc3401d1cb1`
- **Line count:** 11576
- **Read range:** `1-11576`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `345: "en": "Complete booking and payment",`
- `349: "fil": "Kumpletuhin ang booking at pagbabayad"`
- `377: "en": "Booking total:",`
- `381: "fil": "Kabuuang booking:"`
- `401: "en": "Collect points with every booking and redeem them for real rewards",`
- `405: "fil": "Kumuha ng puntos sa bawat booking at i-redeem ang mga ito para sa totoong rewards"`
- `417: "en": "Book",`
- `421: "fil": "Mag-book"`
- `425: "en": "Book an instant consultation with a pediatric specialist for peace of mind.",`
- `429: "fil": "Mag-book ng instant consultation sa isang pediatric specialist para sa kapanatagan ng loob."`
- `433: "en": "Book the offer at",`
- `437: "fil": "I-book ang alok sa"`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `137: "en": "Last recorded session:",`
- `529: "en": "Select a session that fits your time and mood",`
- `533: "fil": "Pumili ng session na akma sa oras at mood mo"`
- `721: "en": "Manage permissions",`
- `841: "en": "Camera permission",`
- `849: "en": "Permission required",`
- `1937: "en": "Permission denied",`
- `1945: "en": "Permission required",`
- `2625: "en": "Available sessions",`
- `2633: "en": "Active sessions",`
- `2641: "en": "Next scheduled session",`
- `2727: "الدخول برمز التحقق (OTP)": {`
### state_transitions
- `25: "en": "* Final price is calculated and confirmed by the provider before payment.",`
- `1073: "en": "Cash refund",`
- `1077: "fil": "Pag-refund ng pera"`
- `1569: "en": "Retry",`
- `1801: "en": "Visit completed successfully",`
- `2185: "en": "Data unavailable or connection failed",`
- `2889: "en": "Cart is empty",`
- `2897: "en": "Your cart is empty",`
- `3105: "en": "Cancel",`
- `3113: "en": "Cancel / Postpone",`
- `3121: "en": "Cancel entire order",`
- `3129: "en": "Cancel operation",`
### payment_insurance_relevance
- `25: "en": "* Final price is calculated and confirmed by the provider before payment.",`
- `341: "fil": "Makipag-ugnayan sa iyong insurance company"`
- `345: "en": "Complete booking and payment",`
- `353: "en": "Complete payment",`
- `369: "en": "Total cost",`
- `377: "en": "Booking total:",`
- `385: "en": "Offer total",`
- `393: "en": "Total bill",`
- `433: "en": "Book the offer at",`
- `549: "fil": "Piliin ang insurance company at ilagay ang policy number"`
- `633: "en": "Select card type",`
- `637: "fil": "Piliin ang uri ng card"`
### error_empty_loading_retry_cancel
- `1569: "en": "Retry",`
- `2185: "en": "Data unavailable or connection failed",`
- `2889: "en": "Cart is empty",`
- `2897: "en": "Your cart is empty",`
- `3105: "en": "Cancel",`
- `3113: "en": "Cancel / Postpone",`
- `3121: "en": "Cancel entire order",`
- `3129: "en": "Cancel operation",`
- `3137: "en": "Cancel and return",`
- `3785: "en": "Your spending this month",`
- `4177: "en": "Confirm canceling emergency request",`
- `4945: "en": "Failed to send",`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
