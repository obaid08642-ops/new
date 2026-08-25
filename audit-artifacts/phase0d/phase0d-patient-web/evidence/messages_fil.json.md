# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `messages/fil.json`
- **Member SHA-256:** `053782b69fa023191b406c490331a45fc09d5cafeafb5a8e5d7ecb01fa1378a3`
- **Line count:** 818
- **Read range:** `1-818`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `14: "body": "Ang karanasan sa web ay binuo ayon sa mga kontrata ng Nabd Plus. Ipinapakita lamang ang mga gamot, booking at coverage kapag may awtorisadong backend data.",`
- `24: "Login": {`
- `29: "submit": "Ligtas na pag-sign in",`
- `30: "submitting": "Bineberipika…",`
- `33: "twoFactorSubmit": "I-verify ang code",`
- `34: "twoFactorSubmitting": "Bineberipika…",`
- `46: "otpSubmitting": "Sine-secure ang pag-sign in…",`
- `64: "diagnostics": "Mga diagnostic booking",`
- `80: "loginTitle": "Mag-sign in ang pasyente"`
- `84: "body": "Hindi mabubuksan ang route na ito o wala kang pahintulot para ma-access ito.",`
- `87: "RouteState": {`
- `94: "retry": "Subukang muli",`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `13: "title": "Nagsisimula ang pangangalaga sa pasyente sa isang ligtas at malinaw na session.",`
- `19: "safeBody": "Inihihiwalay ng pundasyong ito ang pribadong data sa pampublikong nilalaman at inilalayo ang session token sa browser storage.",`
- `20: "safetyOne": "Session na protektado ng server",`
- `24: "Login": {`
- `26: "body": "Ipinapadala ang mga kredensyal sa pamamagitan ng protektadong server layer. Hindi iniimbak ang mga token sa localStorage.",`
- `36: "twoFactorUnavailable": "Hindi magagamit ang verification service. Walang session na ginawa.",`
- `40: "unavailable": "Hindi maabot ang serbisyo. Walang lokal na alternatibong session na ginawa.",`
- `41: "twoFactor": "Kailangan ng session na ito ng karagdagang beripikasyon. Gamitin ang code na ipinadala ng awtorisadong authentication service.",`
- `42: "useOtp": "Gumamit ng one-time code",`
- `44: "otpRequest": "Magpadala ng one-time code",`
- `45: "otpVerify": "I-verify ang code",`
- `46: "otpSubmitting": "Sine-secure ang pag-sign in…",`
### state_transitions
- `21: "safetyTwo": "Malinaw na error at denial state",`
- `59: "loading": "Nilo-load ang portal ng pasyente",`
- `87: "RouteState": {`
- `88: "loadingCode": "Nilo-load",`
- `89: "loadingTitle": "Inihahanda ang pahina",`
- `90: "loadingBody": "Walang alternatibong data na ipinapakita habang hinihintay ang awtorisadong tugon.",`
- `91: "errorCode": "Hindi available ang kahilingan",`
- `92: "errorTitle": "Hindi mabuksan ang pahina ngayon",`
- `93: "errorBody": "Walang alternatibong data o teknikal na detalye ang ipinakita. Subukang muli, o bumalik sa home kung magpatuloy ang problema.",`
- `94: "retry": "Subukang muli",`
- `103: "empty": "Walang inilathalang entry sa katalogo na tumugma sa kasalukuyang paghahanap.",`
- `123: "empty": "Walang order na kasalukuyang magagamit para sa account na ito.",`
### payment_insurance_relevance
- `14: "body": "Ang karanasan sa web ay binuo ayon sa mga kontrata ng Nabd Plus. Ipinapakita lamang ang mga gamot, booking at coverage kapag may awtorisadong backend data.",`
- `136: "total": "Kabuuan",`
- `146: "subtotal": "Subtotal",`
- `148: "total": "Kabuuan",`
- `200: "callDiscard": "Itapon ang session"`
- `282: "notice": "Ito ay listahang pangbasa lamang. Walang payload link, pagmamarka bilang nabasa, pagpaparehistro ng device o pagbabago ng setting na ginagawa mula sa interface na ito.",`
- `364: "notice": "Naitalang paalala lamang ang ipinapakita. Hindi gumagawa ang interface na ito ng lokal na alerto o iskedyul at hindi nagtatala ng dosis, snooze o refill. Ang impormasyong ito ay hindi payong medikal."`
- `372: "insurance": "Seguro",`
- `404: "Insurance": {`
- `405: "eyebrow": "Pribadong insurance",`
- `406: "title": "Buod ng insurance",`
- `407: "notice": "Limitadong policy summary lamang mula sa server ang ipinapakita. Hindi ipinapakita ang policy number, member ID, card files, claims o payments.",`
### error_empty_loading_retry_cancel
- `21: "safetyTwo": "Malinaw na error at denial state",`
- `59: "loading": "Nilo-load ang portal ng pasyente",`
- `88: "loadingCode": "Nilo-load",`
- `89: "loadingTitle": "Inihahanda ang pahina",`
- `90: "loadingBody": "Walang alternatibong data na ipinapakita habang hinihintay ang awtorisadong tugon.",`
- `91: "errorCode": "Hindi available ang kahilingan",`
- `92: "errorTitle": "Hindi mabuksan ang pahina ngayon",`
- `93: "errorBody": "Walang alternatibong data o teknikal na detalye ang ipinakita. Subukang muli, o bumalik sa home kung magpatuloy ang problema.",`
- `94: "retry": "Subukang muli",`
- `103: "empty": "Walang inilathalang entry sa katalogo na tumugma sa kasalukuyang paghahanap.",`
- `123: "empty": "Walang order na kasalukuyang magagamit para sa account na ito.",`
- `144: "empty": "Walang laman ang iyong cart.",`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
