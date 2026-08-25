# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `server/db.ts`
- **Member SHA-256:** `16cff90aae436a580326ab9ad143cd9979dc627a4570d2eb225124739ab983a1`
- **Line count:** 92
- **Read range:** `1-92`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `38: const textFields = ["name", "email", "loginMethod"] as const;`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `38: const textFields = ["name", "email", "loginMethod"] as const;`
- `55: if (user.role !== undefined) {`
- `56: values.role = user.role;`
- `57: updateSet.role = user.role;`
- `58: } else if (user.openId === ENV.ownerOpenId) {`
- `59: values.role = 'admin';`
- `60: updateSet.role = 'admin';`
### state_transitions
- `13: } catch (error) {`
- `14: console.warn("[Database] Failed to connect:", error);`
- `23: throw new Error("User openId is required for upsert");`
- `74: } catch (error) {`
- `75: console.error("[Database] Failed to upsert user:", error);`
- `76: throw error;`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `13: } catch (error) {`
- `14: console.warn("[Database] Failed to connect:", error);`
- `23: throw new Error("User openId is required for upsert");`
- `74: } catch (error) {`
- `75: console.error("[Database] Failed to upsert user:", error);`
- `76: throw error;`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
