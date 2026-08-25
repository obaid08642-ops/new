# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `client/public/__manus__/debug-collector.js`
- **Member SHA-256:** `e95d3246bc3757b46286221060b7346ea59fb6a9c94aa05f5eae7e7e09877d1b`
- **Line count:** 821
- **Read range:** `1-821`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `7: * 3) User interactions (semantic uiEvents: click/type/submit/nav/scroll/etc.)`
- `319: "submit",`
- `323: logUiEvent("submit", { target: describeElement(t) });`
- `759: // Report on page unload`
### backend_consumers_or_contracts
- `466: return originalFetch(input, init);`
- `493: return originalFetch(input, init)`
- `740: return originalFetch(CONFIG.reportEndpoint, {`
### auth_ownership
- `10: * Note: uiEvents are mirrored to sessionEvents for sessionReplay.log`
- `32: "token",`
- `35: "authorization",`
- `36: "cookie",`
- `37: "session",`
- `171: var role = getAttr("role") || null;`
- `196: role: role,`
- `734: // Mirror uiEvents to sessionEvents for sessionReplay.log`
- `735: sessionEvents: uiEvents,`
- `777: // Mirror uiEvents to sessionEvents for sessionReplay.log`
- `778: sessionEvents: uiEvents,`
- `792: sessionEvents: uiEvents.slice(-100),`
### state_transitions
- `100: if (arg instanceof Error) {`
- `101: return { type: "Error", message: arg.message, stack: arg.stack };`
- `351: var origPush = history.pushState;`
- `352: history.pushState = function () {`
- `354: nav("pushState");`
- `357: var origReplace = history.replaceState;`
- `358: history.replaceState = function () {`
- `360: nav("replaceState");`
- `363: window.addEventListener("popstate", function () {`
- `364: nav("popstate");`
- `380: error: console.error.bind(console),`
- `383: ["log", "debug", "info", "warn", "error"].forEach(function (method) {`
### payment_insurance_relevance
- `240: function logUiEvent(kind, payload) {`
- `246: payload: sanitizeValue(payload),`
- `730: var payload = {`
- `743: body: JSON.stringify(payload),`
- `773: var payload = {`
- `783: var payloadStr = JSON.stringify(payload);`
- `786: if (payloadStr.length > MAX_BEACON_SIZE) {`
- `788: var truncatedPayload = {`
- `796: payloadStr = JSON.stringify(truncatedPayload);`
- `798: navigator.sendBeacon(CONFIG.reportEndpoint, payloadStr);`
### error_empty_loading_retry_cancel
- `100: if (arg instanceof Error) {`
- `101: return { type: "Error", message: arg.message, stack: arg.stack };`
- `105: } catch (e) {`
- `124: } catch (e) {`
- `137: } catch (e) {`
- `147: } catch (e) {`
- `156: } catch (e) {`
- `230: } catch (e) {`
- `380: error: console.error.bind(console),`
- `383: ["log", "debug", "info", "warn", "error"].forEach(function (method) {`
- `391: stack: method === "error" ? new Error().stack : null,`
- `401: window.addEventListener("error", function (event) {`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
