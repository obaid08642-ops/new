# Runtime check, Batch 1c (patient-app: pharmacy offers), 2026-10-06

Backend: http://localhost:3002/api/v1 (local test database, NODE_ENV=test), seeded patient `+966509999999`, a guest session (`POST /auth/guest`) and no session. Only GET calls were executed; every POST is listed as not executed (it would change data: money and order state). The order used is the one draft order the pharmacy seeder created for the seeded patient (`b8d1e5c8-...`, status `draft`, 3 items). Script: a plain fetch loop, output pasted as printed.

## Calls of the three screens

| Screen | Call | Executed |
|---|---|---|
| `/pharmacy/broadcast-status` | GET `/patient/pharmacy/orders/:id/offers` | yes (below) |
| `/pharmacy/broadcast-status` | GET `/patient/pharmacy/orders/:id` | yes (below) |
| `/pharmacy/broadcast-status` | POST `/patient/pharmacy/orders/:id/offers/:offerId/select` | not executed (mutation; covered by `src/__tests__/pharmacy/offers-screens.test.tsx`) |
| `/pharmacy/broadcast-status` | POST `/patient/pharmacy/orders/:id/cancel` | not executed |
| `/pharmacy/final-quote` | GET `/patient/pharmacy/orders/:id` | yes |
| `/pharmacy/final-quote` | POST `.../final-quote/accept`, POST `.../cod/register` | not executed |
| `/pharmacy/waiting-for-pharmacy` | no call (redirect) | n/a |

## Answers (patient / guest / none)

```
patient GET /patient/pharmacy/orders/:orderId/offers => 200 array(0)
patient GET /patient/pharmacy/orders/:orderId => 200 {id,patient_account_id,status,items,delivery_address,fulfillment,payment_mode,prescription_attachments,…} status=draft governed_state=null
patient GET /patient/pharmacy/orders/does-not-exist/offers => 404 {message,error,statusCode} message=order_not_found
patient GET /patient/pharmacy/orders/does-not-exist => 404 {message,error,statusCode} message=order_not_found
guest GET /patient/pharmacy/orders/:orderId/offers => 404 {message,error,statusCode} message=order_not_found
guest GET /patient/pharmacy/orders/:orderId => 403 {message,error,statusCode} message=not_yours
guest GET /patient/pharmacy/orders/does-not-exist/offers => 404 {message,error,statusCode} message=order_not_found
guest GET /patient/pharmacy/orders/does-not-exist => 404 {message,error,statusCode} message=order_not_found
none GET /patient/pharmacy/orders/:orderId/offers => 401 {message,error,statusCode} message=Missing token
none GET /patient/pharmacy/orders/:orderId => 401 {message,error,statusCode} message=Missing token
none GET /patient/pharmacy/orders/does-not-exist/offers => 401 {message,error,statusCode} message=Missing token
none GET /patient/pharmacy/orders/does-not-exist => 401 {message,error,statusCode} message=Missing token
```

What the screens do with them: a draft order (`status=draft`, `governed_state=null`) draws "This order has not been sent yet"; an empty offers list on a searching order draws the hero with "No offers yet"; a 404/403/401 on the offers call draws the error state with a retry (offline: the offline state), never an empty list.

## What could not be exercised

- **No live offer.** The seeded pharmacies (`pharma-north+phase2@test.com`, `pharma-east+phase2@test.com`) answer `401 invalid credentials` to `POST /provider/auth/login` with the seeder password, and `POST /admin/pharmacy/seed` answers 403 to the seeded patient, so no order could be broadcast and no offer submitted (Needs review, first entry). The offer card, the countdown, the choose, accept, cod and cancel paths were checked with unit/screen tests against answers shaped like the backend DTOs (`pharmacy-offer.service.ts` `patientDtoAsync`, `pharmacy-order.service.ts` `governedView`) and with marked TEST fixtures in the render tool (screenshots suffix `-testdata`).
- No mutation was executed against the backend (money and order state), no payment provider was touched.
- Native device behaviour (haptics, the OS "reduce motion" setting on a phone, the alert sheet) was not run; the app was rendered through react-native-web and tested under jest-expo.

## Screens against the states

| State | How it was seen |
|---|---|
| normal (3 test offers, countdowns, lowest price, partial availability, no name) | render tool, TEST fixtures, `after/broadcast-status-*-testdata-*.png` |
| searching, no offers | fixture `test-order-none`; also real: draft order draws "not sent yet" |
| review (search ended without offers), cancelled, offer already chosen | fixtures `-review`, `-cancelled`, `-selected` |
| empty answers (`--api empty`) / offline (`--api offline`) | `after/broadcast-status-ar-390-empty-*.png`, `-offline-*.png` |
| final quote: accept, accepted (pay online / cash on delivery), cod registered, no quote | fixtures `test-order-quote`, `-accepted`, `-cod`, `-noquote` |
