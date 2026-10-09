const orderId = "[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}";
const memberId = "[A-Za-z0-9_-]{1,128}";
const threadId = orderId;
const patientReadRoutes = [
  new RegExp("^/orders/mine$"),
  new RegExp("^/care/appointments$", "i"),
  new RegExp("^/labs/bookings/mine$", "i"),
  new RegExp("^/radiology/bookings/mine$", "i"),
  new RegExp("^/prescriptions/mine$"),
  new RegExp("^/prescriptions/active$"),
  new RegExp(`^/prescriptions/${orderId}$`, "i"),
  new RegExp(`^/orders/${orderId}$`, "i"),
  new RegExp("^/patient/pharmacy/orders$"),
  new RegExp(`^/patient/pharmacy/orders/${orderId}$`, "i"),
  new RegExp(`^/patient/pharmacy/orders/${orderId}/offers$`, "i"),
  new RegExp("^/labs/services$", "i"),
  new RegExp("^/home-care/bookings/my$", "i"),
  new RegExp("^/home-care/bookings/[A-Za-z0-9-]{1,64}$", "i"),
  new RegExp("^/emergency/tracking$", "i"),
  new RegExp("^/family/chat/messages$", "i"),
  new RegExp(`^/offers/${orderId}$`, "i"),
  new RegExp(`^/promotions/offers/${orderId}/providers$`, "i"),
  new RegExp("^/medicines$", "i"),
  new RegExp("^/medicines/by-barcode/[^/]{1,64}$", "i"),
  new RegExp("^/insurance/requests/my$", "i"),
  new RegExp(`^/insurance/requests/${orderId}$`, "i"),
  new RegExp("^/users/me/addresses$", "i"),
  // components-next/account/geo-select: regions, cities and districts through the proxy (needs-review issue 780).
  new RegExp("^/locations/(regions|cities)$", "i"),
  new RegExp("^/locations/districts\\?city=[^&#]{1,120}$", "i"),
  new RegExp("^/nutrition/profile$", "i"),
  new RegExp("^/support/chat$", "i"),
  new RegExp(`^/orders/${orderId}/tracking$`, "i"),
  new RegExp("^/cart$"),
  new RegExp("^/cart/checkout$"),
  new RegExp("^/cart/prescription$"),
  new RegExp("^/nursing/visits$"),
  new RegExp(`^/nursing/visits/${orderId}$`, "i"),
  new RegExp(`^/nursing/visits/${orderId}/tracking$`, "i"),
  new RegExp("^/users/me/wishlist$"),
  // app/[locale]/map: nearby providers (public read)
  new RegExp("^/providers/map$", "i"),
  new RegExp("^/users/me/profile$"),
  new RegExp("^/users/me/notification-settings$"),
  new RegExp(`^/unified-bookings/consultation/${orderId}$`, "i"),
  new RegExp(`^/care/appointments/${orderId}$`, "i"),
  new RegExp("^/health/score$"),
  new RegExp("^/health/reports$"),
  new RegExp("^/health/sleep\\?limit=100$"),
  new RegExp("^/health/vitals\\?limit=100$"),
  new RegExp("^/health/vitals-log$"),
  new RegExp("^/health/emergency-contacts$"),
  new RegExp("^/health/chronic-diseases$"),
  new RegExp("^/health/chronic-meds$"),
  new RegExp("^/health/trends$"),
  new RegExp("^/family/my-group$"),
  new RegExp("^/family/members$"),
  new RegExp(`^/family/member-records/${memberId}$`, "i"),
  new RegExp("^/family/calendar$"),
  new RegExp("^/insurance/my-policy$"),
  new RegExp("^/insurance/benefits-summary$"),
  new RegExp("^/insurance/claims$"),
  new RegExp(`^/payments/pharmacy/${orderId}/capabilities$`, "i"),
  new RegExp(`^/pharmacy/chat/threads\\?order_id=${orderId}$`, "i"),
  new RegExp(`^/pharmacy/chat/threads/${threadId}/messages$`, "i"),
  new RegExp("^/mental-health/dashboard$"),
  new RegExp("^/mental-health/breathing$"),
  new RegExp("^/mental-health/mood\\?days=30$"),
  new RegExp("^/mental-health/meditation$"),
  new RegExp("^/users/me/privacy-settings$"),
  new RegExp("^/users/me/security-settings$"),
  new RegExp("^/users/me/storage$"),
  new RegExp("^/users/me/sessions$"),
  new RegExp("^/articles/bookmarks/mine$"),
  // the article page asks whether the signed-in patient saved the article (the Save button)
  new RegExp("^/articles/bookmarks/[A-Za-z0-9_-]{1,160}/status$"),
  new RegExp("^/chat/threads$"),
  new RegExp(`^/chat/threads/${threadId}$`, "i"),
  new RegExp(`^/chat/threads/${threadId}/messages\\?limit=50$`, "i"),
  new RegExp(`^/chat/threads/${threadId}/permissions$`, "i"),
  // The proxy tests the percent-encoded query: a 120-character query is at most 1440 encoded characters (12 per astral character).
  new RegExp("^/home/search\\?q=[^&]{1,1440}$", "i"),
  new RegExp("^/support/faqs$", "i"),
  new RegExp("^/support/requests/mine$", "i"),
  new RegExp(`^/support/requests/${orderId}$`, "i"),
  new RegExp(`^/support/requests/${orderId}/reply$`, "i"),
  new RegExp("^/loyalty/account$", "i"),
  new RegExp("^/loyalty/transactions(\\?page=\\d+)?$", "i"),
  new RegExp("^/loyalty/rewards$", "i"),
  new RegExp("^/emergency/my/active$", "i"),
  new RegExp(`^/labs/bookings/${orderId}$`, "i"),
  new RegExp(`^/labs/bookings/${orderId}/tracking$`, "i"),
  // A1: the patient wallet is gone — these backend routes no longer exist.
];

const diagnosticsMutationRoutes: Array<{ method: "POST" | "PATCH"; route: RegExp }> = [
  { method: "POST", route: new RegExp("^/labs/bookings$") },
  { method: "POST", route: new RegExp(`^/labs/bookings/${orderId}/documents$`, "i") },
  { method: "PATCH", route: new RegExp(`^/labs/bookings/${orderId}/reschedule$`, "i") },
  // Lab insurance approval: the patient pays cash for an item insurance rejected (labs.controller opt-in-cash).
  { method: "PATCH", route: new RegExp(`^/labs/bookings/${orderId}/items/[^/]{1,128}/opt-in-cash$`, "i") },
  { method: "PATCH", route: new RegExp(`^/orders/${orderId}/items/[^/]{1,128}/opt-in-cash$`, "i") },
  { method: "POST", route: new RegExp("^/family/chat/messages$", "i") },
  { method: "POST", route: new RegExp("^/nutrition/profile$", "i") },
  { method: "POST", route: new RegExp("^/maternity/profile$", "i") },
  { method: "POST", route: new RegExp("^/support/chat$", "i") },
  { method: "POST", route: new RegExp(`^/support/requests/[^/]+/reply$`, "i") },
  { method: "POST", route: new RegExp("^/medical/programs/complete-session$", "i") },
  { method: "PATCH", route: new RegExp("^/users/me/notification-settings$") },
  { method: "PATCH", route: new RegExp("^/users/me/profile$") },
];

// The health screens add a night of sleep and add or remove the patient's own emergency contacts (backend health.controller);
// the article page saves or unsaves one article (backend articles.module: POST /articles/bookmarks/:slug/toggle).
const healthMutationRoutes: Array<{ method: "POST" | "DELETE"; route: RegExp }> = [
  { method: "POST", route: new RegExp("^/health/sleep$") },
  { method: "POST", route: new RegExp("^/health/emergency-contacts$") },
  { method: "DELETE", route: new RegExp("^/health/emergency-contacts/[A-Za-z0-9_-]{1,128}$") },
  { method: "POST", route: new RegExp("^/articles/bookmarks/[A-Za-z0-9_-]{1,160}/toggle$") },
];

const pharmacyMutationRoutes: Array<{ method: "POST" | "PATCH"; route: RegExp }> = [
  { method: "POST", route: new RegExp("^/patient/pharmacy/orders$") },
  { method: "POST", route: new RegExp("^/prescriptions/upload$") },
  { method: "POST", route: new RegExp("^/ai/prescription-ocr$") },
  { method: "PATCH", route: new RegExp(`^/patient/pharmacy/orders/${orderId}$`, "i") },
  { method: "POST", route: new RegExp(`^/patient/pharmacy/orders/${orderId}/submit$`, "i") },
  { method: "POST", route: new RegExp(`^/patient/pharmacy/orders/${orderId}/cancel$`, "i") },
  { method: "POST", route: new RegExp(`^/patient/pharmacy/orders/${orderId}/offers/${orderId}/select$`, "i") },
  { method: "POST", route: new RegExp(`^/patient/pharmacy/orders/${orderId}/final-quote/accept$`, "i") },
  { method: "POST", route: new RegExp(`^/patient/pharmacy/orders/${orderId}/insurance/co-pay/accept$`, "i") },
  { method: "POST", route: new RegExp(`^/patient/pharmacy/orders/${orderId}/insurance/self-pay/accept$`, "i") },
  { method: "POST", route: new RegExp(`^/patient/pharmacy/orders/${orderId}/cod/register$`, "i") },
  // the way out of a rejected insurance decision besides paying the full price (backend: cancelRejectedByPatient)
  { method: "POST", route: new RegExp(`^/patient/pharmacy/orders/${orderId}/insurance-rejection/cancel$`, "i") },
  { method: "POST", route: new RegExp(`^/payments/intent/pharmacy/${orderId}$`, "i") },
  { method: "POST", route: new RegExp(`^/pharmacy/chat/threads/${threadId}/messages$`, "i") },
  { method: "POST", route: new RegExp(`^/pharmacy/chat/threads/${threadId}/accept-substitute/[A-Za-z0-9_-]{1,128}$`, "i") },
  { method: "POST", route: new RegExp(`^/pharmacy/chat/threads/${threadId}/reject$`, "i") },
  { method: "POST", route: new RegExp(`^/pharmacy/chat/threads/${threadId}/remove-item$`, "i") },
  { method: "POST", route: new RegExp("^/support/requests$", "i") },
  { method: "POST", route: new RegExp("^/loyalty/rewards/[A-Za-z0-9-]{1,64}/claim$", "i") },
  { method: "POST", route: new RegExp("^/health/reminders$", "i") },
  { method: "POST", route: new RegExp("^/emergency/trigger$", "i") },
  { method: "POST", route: new RegExp("^/emergency/[A-Za-z0-9-]{1,64}/cancel$", "i") },
  { method: "POST", route: new RegExp("^/ai/triage$", "i") },
  { method: "POST", route: new RegExp("^/loyalty/challenges/[A-Za-z0-9-]{1,64}/join$", "i") },
  { method: "POST", route: new RegExp("^/referrals/apply$", "i") },
  { method: "POST", route: new RegExp("^/loyalty/rewards/[A-Za-z0-9-]{1,64}/claim$", "i") },
  { method: "POST", route: new RegExp("^/auth/heartbeat$", "i") },
  // the heart on the product page (components-next/pharmacy/wishlist-heart): backend POST /users/me/wishlist/:itemId toggles one medicine
  { method: "POST", route: new RegExp("^/users/me/wishlist/[A-Za-z0-9_-]{1,128}$") },
];

export function isAllowedPatientApiPath(path: string) {
  return patientReadRoutes.some((route) => route.test(path));
}

// Q10: the website address book (components-next/addresses.tsx) adds and removes the patient's own addresses.
// The delivery address picker (components-next/delivery-address) makes one of them the default (PATCH `is_default`).
const addressMutationRoutes: Array<{ method: "POST" | "DELETE" | "PATCH"; route: RegExp }> = [
  { method: "POST", route: new RegExp("^/users/me/addresses$") },
  { method: "DELETE", route: new RegExp(`^/users/me/addresses/${orderId}$`, "i") },
  { method: "PATCH", route: new RegExp(`^/users/me/addresses/${orderId}$`, "i") },
];

// The notifications list marks one notification, or all of them, as read (backend POST /notifications/:id/read and /read-all).
const notificationMutationRoutes: Array<{ method: "POST"; route: RegExp }> = [
  { method: "POST", route: new RegExp(`^/notifications/${orderId}/read$`, "i") },
  { method: "POST", route: new RegExp("^/notifications/read-all$") },
];

export function isAllowedPatientApiRequest(path: string, method: string) {
  return (method === "GET" && isAllowedPatientApiPath(path))
    || notificationMutationRoutes.some((candidate) => candidate.method === method && candidate.route.test(path))
    || healthMutationRoutes.some((candidate) => candidate.method === method && candidate.route.test(path))
    || addressMutationRoutes.some((candidate) => candidate.method === method && candidate.route.test(path))
    || diagnosticsMutationRoutes.some((candidate) => candidate.method === method && candidate.route.test(path))
    || pharmacyMutationRoutes.some((candidate) => candidate.method === method && candidate.route.test(path));
}

// The proxy receives the path and the query separately. Most entries are bare paths (any query passes through);
// a few pin an exact query (`/home/search?q=…`, `/pharmacy/chat/threads?order_id=<uuid>`), so the target is also
// checked with its query, otherwise those entries can never match.
export function isAllowedPatientApiTarget(path: string, search: string, method: string) {
  return isAllowedPatientApiRequest(path, method) || (search !== "" && isAllowedPatientApiRequest(`${path}${search}`, method));
}
