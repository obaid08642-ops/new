# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `vite.config.ts`
- **Member SHA-256:** `1b4f11ec05e426ffb9b020cf18ed5bb979b7f042ad43bfd5d9043b569843afab`
- **Line count:** 187
- **Read range:** `1-187`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `19: type LogSource = "browserConsole" | "networkRequests" | "sessionReplay";`
- `74: * - Files: browserConsole.log, networkRequests.log, sessionReplay.log`
- `115: if (payload.sessionEvents?.length > 0) {`
- `116: writeToLogFile("sessionReplay", payload.sessionEvents);`
### state_transitions
- `48: /* ignore trim errors */`
- `120: res.end(JSON.stringify({ success: true }));`
- `129: res.end(JSON.stringify({ success: false, error: String(e) }));`
- `145: res.end(JSON.stringify({ success: false, error: String(e) }));`
- `169: emptyOutDir: true,`
### payment_insurance_relevance
- `107: const handlePayload = (payload: any) => {`
- `109: if (payload.consoleLogs?.length > 0) {`
- `110: writeToLogFile("browserConsole", payload.consoleLogs);`
- `112: if (payload.networkRequests?.length > 0) {`
- `113: writeToLogFile("networkRequests", payload.networkRequests);`
- `115: if (payload.sessionEvents?.length > 0) {`
- `116: writeToLogFile("sessionReplay", payload.sessionEvents);`
- `126: handlePayload(reqBody);`
- `141: const payload = JSON.parse(body);`
- `142: handlePayload(payload);`
### error_empty_loading_retry_cancel
- `47: } catch {`
- `48: /* ignore trim errors */`
- `127: } catch (e) {`
- `129: res.end(JSON.stringify({ success: false, error: String(e) }));`
- `143: } catch (e) {`
- `145: res.end(JSON.stringify({ success: false, error: String(e) }));`
- `169: emptyOutDir: true,`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
