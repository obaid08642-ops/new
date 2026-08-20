const orderId = "[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}";
const patientReadRoutes = [new RegExp("^/orders/mine$"), new RegExp(`^/orders/${orderId}$`, "i")];

export function isAllowedPatientApiPath(path: string) {
  return patientReadRoutes.some((route) => route.test(path));
}

export function isAllowedPatientApiRequest(path: string, method: string) {
  return method === "GET" && isAllowedPatientApiPath(path);
}
