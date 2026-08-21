const orderId = "[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}";
const patientReadRoutes = [
  new RegExp("^/orders/mine$"),
  new RegExp(`^/orders/${orderId}$`, "i"),
  new RegExp("^/patient/pharmacy/orders$"),
  new RegExp(`^/patient/pharmacy/orders/${orderId}$`, "i"),
  new RegExp(`^/orders/${orderId}/tracking$`, "i"),
  new RegExp("^/cart$"),
  new RegExp("^/cart/checkout$"),
  new RegExp("^/cart/prescription$"),
  new RegExp(`^/unified-bookings/consultation/${orderId}$`, "i"),
  new RegExp("^/health/score$"),
  new RegExp("^/health/reports$"),
  new RegExp("^/insurance/my-policy$"),
  new RegExp("^/insurance/benefits-summary$"),
  new RegExp("^/insurance/claims$"),
  new RegExp("^/mental-health/dashboard$"),
  new RegExp("^/users/me/privacy-settings$"),
  new RegExp("^/users/me/security-settings$"),
  new RegExp("^/users/me/storage$"),
  new RegExp("^/users/me/sessions$"),
  new RegExp("^/articles/bookmarks/mine$"),
];

export function isAllowedPatientApiPath(path: string) {
  return patientReadRoutes.some((route) => route.test(path));
}

export function isAllowedPatientApiRequest(path: string, method: string) {
  return method === "GET" && isAllowedPatientApiPath(path);
}
