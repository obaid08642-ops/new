/**
 * Nabd Admin — API Endpoints
 *
 * هذا الملف منظم على هيئة مجموعات (groups) تطابق الـ Sidebar groups.
 * الدوال أدناه ترسل طلبات فعلية عبر العميل المركزي؛ ويجب التحقق من كل عقد
 * على staging قبل تفعيل تدفق إداري حساس في الإنتاج.
 */
import client from "./client";

// ============================================================
// 🔐 AUTH
// ============================================================
export const authApi = {
  login: (email, password) => client.post("/auth/login", { email, password }),
  logout: () => client.post("/auth/logout"),
  me: () => client.get("/auth/me"),
};

// ============================================================
// 📊 DASHBOARD / KPIs
// ============================================================
export const dashboardApi = {
  kpis: () => client.get("/dashboard/kpis"),
  alerts: () => client.get("/dashboard/alerts"),
  liveFeed: () => client.get("/dashboard/live-feed"),
};

// ============================================================
// 📡 BROADCAST & EMERGENCY
// ============================================================
export const broadcastApi = {
  live: () => client.get("/broadcast/live"),
  expand: (id) => client.post(`/broadcast/${id}/expand`),
  cancel: (id) => client.post(`/broadcast/${id}/cancel`),
  config: () => client.get("/broadcast/config"),
  updateConfig: (payload) => client.put("/broadcast/config", payload),
};
export const emergencyApi = {
  live: () => client.get("/emergency/live"),
  dispatch: (id, ambulance_id) => client.post(`/emergency/${id}/dispatch`, { ambulance_id }),
};

// ============================================================
// 🔌 KILL SWITCHES
// ============================================================
export const killSwitchApi = {
  list: () => client.get("/kill-switches"),
  toggle: (key, value, reason) => client.post(`/kill-switches/${key}`, { value, reason }),
};

// ============================================================
// 🏥 PROVIDERS
// ============================================================
export const providersApi = {
  list: (params) => client.get("/providers/admin/all", { params }),
  get: (id) => client.get(`/providers/${id}`),
  approve: (id, payload) => client.post(`/providers/${id}/approve`, payload),
  reject: (id, reason) => client.post(`/providers/${id}/reject`, { reason }),
  suspend: (id, reason) => client.post(`/providers/${id}/suspend`, { reason }),
  update: (id, payload) => client.put(`/providers/${id}`, payload),
  pendingApprovals: () => client.get("/providers/admin/pending"),
  subAccounts: (parent_id) => client.get(`/providers/${parent_id}/sub-accounts`),
  create: (payload) => client.post("/providers/admin/create", payload),
};
export const doctorsApi = {
  list: (params) => client.get("/providers/admin/all", { params: { type: "doctor", ...params } }),
  get: (id) => client.get(`/providers/${id}`),
};
export const contractsApi = { list: () => client.get("/contracts") };
export const slaApi = { list: (params) => client.get("/admin/governance/providers-performance", { params }) };
export const shiftsApi = { list: () => client.get("/shifts") };
export const scorecardApi = { list: () => client.get("/scorecard") };
export const complianceApi = { list: () => client.get("/compliance") };
export const transportApi = { list: () => client.get("/transport") };

// ============================================================
// 👥 USERS / PATIENTS
// ============================================================
export const patientsApi = {
  list: (params) => client.get("/users", { params: { role: "patient", ...params } }),
  get: (id) => client.get(`/users/${id}`),
  block: (id) => client.post(`/users/${id}/toggle`),
  unblock: (id) => client.post(`/users/${id}/toggle`),
};
export const familyApi = { list: () => client.get("/family-cards") };
export const walletApi = {
  list: (params) => client.get("/wallet/transactions", { params }),
  credit: (user_id, amount, reason) => client.post("/wallet/credit", { user_id, amount, reason }),
};
export const blacklistApi = { list: () => client.get("/blacklist") };
export const fraudApi = { list: () => client.get("/fraud/alerts") };
export const adminsApi = { list: () => client.get("/admins") };

// ============================================================
// 📦 OPERATIONS / ORDERS
// ============================================================
export const ordersApi = {
  list: (params) => client.get("/orders", { params }),
  get: (id) => client.get(`/orders/${id}`),
  cancel: (id, reason) => client.post(`/orders/${id}/cancel`, { reason }),
  reassign: (id, provider_id) => client.post(`/orders/${id}/reassign`, { provider_id }),
};
export const appointmentsApi = {
  list: () => client.get("/care/appointments"),
  cancel: (id, reason) => client.patch(`/care/appointments/${id}/cancel`, { reason }),
  reschedule: (id, slot_start) => client.patch(`/care/appointments/${id}/reschedule`, { slot_start }),
  confirm: (id) => client.patch(`/care/appointments/${id}/confirm`),
  complete: (id) => client.patch(`/care/appointments/${id}/complete`),
};
export const waitlistApi = { list: () => client.get("/waitlist") };
export const referralsApi = { list: () => client.get("/referrals") };
export const chatApi = { list: () => client.get("/chat/threads") };
export const pharmacyOrdersApi = { list: (params) => client.get("/orders", { params }) };
export const b2bApi = {
  list: () => client.get("/b2b/requests"),
  approve: (id, note) => client.post(`/b2b/requests/${id}/approve`, { note }),
  reject: (id, note) => client.post(`/b2b/requests/${id}/reject`, { note }),
};
export const labResultsApi = { list: () => client.get("/lab-results") };
export const complaintsApi = { list: () => client.get("/complaints") };
export const tasksApi = { list: () => client.get("/tasks") };

// ============================================================
// 🩺 MASTER DATA
// ============================================================
export const specialtiesApi = { list: () => client.get("/specialties") };
export const servicesApi = { list: () => client.get("/services") };
export const medicinesApi = {
  list: (params) => client.get("/medicines", { params }),
  create: (payload) => client.post("/medicines/admin/catalog", payload),
  update: (id, payload) => client.patch(`/medicines/${id}`, payload),
  delete: (id) => client.delete(`/medicines/admin/catalog/${id}`),
  reportShortage: (id, reporter) => client.post(`/medicines/${id}/shortage`, { reporter }),
};
export const shortageApi = {
  list: () => client.get("/admin/pharmacy/shortage-flags"),
  approve: (id) => client.post(`/admin/pharmacy/shortage-flags/${id}/approve`),
  reject: (id, reason) => client.post(`/admin/pharmacy/shortage-flags/${id}/reject`, { reason }),
  resolve: (id) => client.post(`/admin/pharmacy/shortage-flags/${id}/resolve`),
  markShortage: (id, status, notes) => client.post(`/admin/pharmacy/shortage-flags/${id}/mark`, { status, notes }),
};
export const labTestsApi = { 
  list: () => client.get("/labs/services"),
  create: (payload) => client.post("/labs/admin/catalog", payload),
  update: (id, payload) => client.put(`/labs/admin/catalog/${id}`, payload),
  delete: (id) => client.delete(`/labs/admin/catalog/${id}`)
};
export const imagingApi = { 
  list: () => client.get("/radiology/services"),
  create: (payload) => client.post("/radiology/admin/catalog", payload),
  update: (id, payload) => client.put(`/radiology/admin/catalog/${id}`, payload),
  delete: (id) => client.delete(`/radiology/admin/catalog/${id}`)
};

export const diagnosticsOrdersApi = {
  listLabs: (params) => client.get("/labs/admin/all", { params }),
  listRadiology: (params) => client.get("/radiology/admin/all", { params }),
  forceLabState: (id, state, note) => client.patch(`/labs/admin/bookings/${id}/force-state`, { state, note }),
  forceRadiologyState: (id, state, note) => client.patch(`/radiology/admin/bookings/${id}/force-state`, { state, note })
};
export const nursingApi = { list: () => client.get("/nursing-services") };
export const bulkUploadApi = {
  upload: (formData) => client.post("/bulk-upload", formData, { headers: { "Content-Type": "multipart/form-data" } }),
};

// ============================================================
// 🛡️ FINANCIAL & INSURANCE
// ============================================================
export const insuranceApi = {
  list: () => client.get("/insurance/companies"),
  create: (payload) => client.post("/insurance/companies", payload),
};
export const claimsApi = {
  list: () => client.get("/insurance/claims"),
  approve: (id) => client.post(`/insurance/claims/${id}/approve`),
  reject: (id, reason) => client.post(`/insurance/claims/${id}/reject`, { reason }),
};
export const financialApi = { summary: () => client.get("/financial/summary") };
export const commissionsApi = {
  list: () => client.get("/commissions"),
  update: (id, commission) => client.put(`/commissions/${id}`, { commission }),
};
export const refundsApi = {
  list: () => client.get("/refunds"),
  issue: (order_id, amount, reason) => client.post("/refunds", { order_id, amount, reason }),
};
export const couponsApi = {
  list: () => client.get("/coupons"),
  create: (payload) => client.post("/coupons", payload),
};

// ============================================================
// ✨ LOYALTY POINTS (نظام النبضات)
// ============================================================
export const loyaltyApi = {
  config: () => client.get("/loyalty/config"),
  updateConfig: (payload) => client.put("/loyalty/config", payload),
  updateEarnRule: (rule_id, payload) => client.put(`/loyalty/earn-rules/${rule_id}`, payload),
  toggleEarnRule: (rule_id) => client.post(`/loyalty/earn-rules/${rule_id}/toggle`),
  transactions: (params) => client.get("/loyalty/transactions", { params }),
  userBalance: (user_id) => client.get(`/loyalty/users/${user_id}/balance`),
  manualAdjust: (payload) => client.post("/loyalty/manual-adjust", payload),
  // payload: { user_id, points (+/-), reason }
  redeem: (payload) => client.post("/loyalty/redeem", payload),
  // payload: { user_id, points, order_id }
};

// ============================================================
// 🚚 DELIVERY RULES (التوصيل المجاني)
// ============================================================
export const deliveryApi = {
  rules: () => client.get("/delivery/rules"),
  toggleSystem: (enabled) => client.post("/delivery/toggle", { enabled }),
  updateBaseFees: (payload) => client.put("/delivery/base-fees", payload),
  // payload: { base_delivery_fee_sar, rush_delivery_fee_sar, global_min_order_sar }
  createRule: (payload) => client.post("/delivery/rules", payload),
  updateRule: (rule_id, payload) => client.put(`/delivery/rules/${rule_id}`, payload),
  toggleRule: (rule_id) => client.post(`/delivery/rules/${rule_id}/toggle`),
  deleteRule: (rule_id) => client.delete(`/delivery/rules/${rule_id}`),
  // Used by patient/provider apps:
  checkFreeDelivery: (params) => client.get("/delivery/check", { params }),
  // params: { user_id, order_amount, service_type, city }
};

// ============================================================
// 🎁 PROMOTIONS (العروض والخصومات العامة)
// ============================================================
export const promotionsApi = {
  list: (params) => client.get("/promotions", { params }),
  get: (id) => client.get(`/promotions/${id}`),
  create: (payload) => client.post("/promotions", payload),
  update: (id, payload) => client.put(`/promotions/${id}`, payload),
  toggle: (id) => client.post(`/promotions/${id}/toggle`),
  delete: (id) => client.delete(`/promotions/${id}`),
  // Used by patient app at checkout:
  applicable: (params) => client.get("/promotions/applicable", { params }),
  // params: { user_id, order_amount, services, city, gender }
};

// ============================================================
// 📱 CONTENT / NOTIFICATIONS
// ============================================================
export const notificationsApi = {
  history: () => client.get("/notifications/history"),
  send: (payload) => client.post("/notifications/send", payload),
};
export const supportApi = {
  listRequests: (status) => client.get("/support/admin/requests", { params: { status } }),
  updateRequest: (id, payload) => client.patch(`/support/admin/requests/${id}`, payload),
  reply: (id, message) => client.post(`/support/requests/${id}/reply`, { message }),
};
export const autoNotificationsApi = {
  rules: () => client.get("/notifications/auto-rules"),
  updateRule: (id, payload) => client.put(`/notifications/auto-rules/${id}`, payload),
};
export const cmsApi = { list: () => client.get("/cms") };
export const bannersApi = { list: () => client.get("/banners") };
export const reviewsApi = { list: () => client.get("/reviews") };

// ============================================================
// ⚙️ SYSTEM
// ============================================================
export const themeApi = { get: () => client.get("/system/theme"), save: (payload) => client.put("/system/theme", payload) };
export const sysConfigApi = {
  get: () => client.get("/admin/governance/system-config"),
  save: (payload) => client.put("/admin/governance/system-config", payload)
};
export const permissionsApi = { list: () => client.get("/system/permissions") };
export const auditLogsApi = { list: (params) => client.get("/admin/authority/actions", { params }) };
export const impersonationApi = { impersonate: (id) => client.post(`/admin/authority/users/${id}/impersonate`) };
export const workflowApi = { list: () => client.get("/system/workflows") };
export const aiConfigApi = { list: () => client.get("/system/ai-config") };
export const alertRulesApi = { list: () => client.get("/system/alert-rules") };

// ============================================================
// 📈 ANALYTICS & REPORTS
// ============================================================
export const analyticsApi = {
  overview: () => client.get("/analytics/overview"),
  custom: (payload) => client.post("/analytics/custom-report", payload),
};
export const mapApi = { heatmap: () => client.get("/analytics/heatmap") };

// ============================================================
// 📤 EXPORTS
// ============================================================
export const exportApi = {
  download: (entity) => client.get(`/export/${entity}`, { responseType: "blob" })
};

// ============================================================
// 🤖 GAP INTEGRATION APIS
// ============================================================
export const communityApi = {
  pending: (page = 1) => client.get("/community/admin/pending", { params: { page } }),
  moderate: (id, decision) => client.put(`/community/admin/${id}/moderate`, { decision }),
};

export const medicalApi = {
  timeline: (patientId) => client.get("/patients/timeline", { headers: { "x-impersonate-user-id": patientId } }),
  passport: (patientId) => client.get("/patients/passport", { headers: { "x-impersonate-user-id": patientId } }),
};

export const maternityApi = {
  profile: (patientId) => client.get("/maternity/profile", { headers: { "x-impersonate-user-id": patientId } }),
};

export const prescriptionsApi = {
  get: (id) => client.get(`/prescriptions/${id}`),
};

export const homeCareApi = {
  getAllBookings: () => client.get("/nursing/visits"),
  listStaff: () => client.get("/nursing/staff"),
  assignNurse: (id, nurseId) => client.post(`/nursing/visits/${id}/assign`, { nurse_id: nurseId }),
  getMyBookings: () => client.get("/nursing/visits"),
  respondBooking: (id, accept) => client.post(`/nursing/visits/${id}/respond`, { accept }),
  updateGps: (id, lat, lng) => client.post(`/nursing/visits/${id}/gps`, { lat, lng }),
  checkIn: (id, payload) => client.post(`/nursing/visits/${id}/check-in`, payload),
  submitVisitReport: (id, payload) => client.post(`/nursing/visits/${id}/complete`, payload),
  requestInventory: (bookingId, items) => client.post(`/nursing/visits/${bookingId}/supply-requests`, { items }),
};
