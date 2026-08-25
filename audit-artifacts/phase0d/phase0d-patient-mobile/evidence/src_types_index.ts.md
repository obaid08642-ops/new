# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/types/index.ts`
- **Member SHA-256:** `f70070987d331c94a343b5330fb23c31ff0ca8020e654b0a53dbab1743073358`
- **Line count:** 729
- **Read range:** `1-729`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `214: | 'cancelled'`
- `426: status: 'submitted' | 'under_review' | 'approved' | 'rejected' | 'reimbursed';`
- `427: submittedAt: string;`
- `456: type: 'credit' | 'debit' | 'refund' | 'cashback';`
- `630: isBookmarked?: boolean;`
- `656: login: undefined;`
- `657: register: undefined;`
- `658: otp: { phone: string; mode: 'register' | 'login' | 'guest' };`
- `661: 'guest-checkout': { returnScreen: string };`
- `675: 'booking-confirm': { doctorId: string; service: string; date: string; time: string };`
- `676: 'booking-success': { appointmentId: string };`
- `681: 'cancel-appointment': { appointmentId: string };`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `14: role: 'patient' | 'guest';`
- `27: token: string | null;`
- `28: refreshToken: string | null;`
- `528: permissions: 'view' | 'full';`
- `656: login: undefined;`
- `658: otp: { phone: string; mode: 'register' | 'login' | 'guest' };`
- `660: 'reset-password': { token: string };`
- `678: 'video-call': { appointmentId: string; token: string };`
### state_transitions
- `25: export interface AuthState {`
- `29: isLoading: boolean;`
- `32: error: string | null;`
- `54: status: 'normal' | 'high' | 'low' | 'critical';`
- `141: export { Appointment, AppointmentStatus } from './contracts';`
- `190: status: OrderStatus;`
- `206: export type OrderStatus =`
- `207: | 'pending'`
- `213: | 'delivered'`
- `214: | 'cancelled'`
- `245: status: OrderStatus;`
- `263: isCompleted: boolean;`
### payment_insurance_relevance
- `20: walletBalance: number;`
- `45: insurancePolicies: InsurancePolicy[];`
- `84: insuranceCompanies: string[];`
- `98: price: number;`
- `154: price: number;`
- `155: originalPrice?: number;`
- `193: subtotal: number;`
- `196: tax: number;`
- `197: total: number;`
- `198: paymentMethod: PaymentMethod;`
- `203: broadcastOffers?: PharmacyOffer[];`
- `227: acceptsInsurance: boolean;`
### error_empty_loading_retry_cancel
- `29: isLoading: boolean;`
- `32: error: string | null;`
- `207: | 'pending'`
- `214: | 'cancelled'`
- `681: 'cancel-appointment': { appointmentId: string };`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
